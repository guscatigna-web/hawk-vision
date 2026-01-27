import { useEffect, useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { Settings, Plus, Save, RotateCcw, Loader2, LayoutGrid, Filter, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase' 
import { WIDGET_REGISTRY } from '../components/dashboard/widgetConfig'
import { SortableWidget } from '../components/dashboard/SortableWidget'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_LAYOUT = ['revenue', 'orders', 'tables', 'stock', 'dailySales', 'salesChart', 'ifoodChart', 'paymentChart', 'topProducts']

export default function Dashboard() {
  const { user } = useAuth()
  
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const [metrics, setMetrics] = useState({ 
    todayRevenue: 0, 
    revenuePaid: 0, 
    revenueOpen: 0, 
    ticketMedio: 0,
    ticketMedioLocal: 0,
    ticketMedioIfood: 0,
    lowStockCount: 0, 
    activeCashiers: 0,
    openTables: 0,
    totalOrders: 0,
    kds: { kitchenQueue: 0, kitchenPrep: 0, barQueue: 0, barPrep: 0 }
  })
  
  const [chartsData, setChartsData] = useState({ 
    salesByHour: [], 
    paymentMethods: [], 
    topProducts: [], 
    ifoodSalesByDay: [],
    dailySales: []
  })
  
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState(DEFAULT_LAYOUT)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const savedLayout = localStorage.getItem('hawk_dashboard_layout_v2')
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        const validItems = parsed.filter(id => WIDGET_REGISTRY[id])
        setItems(validItems.length > 0 ? validItems : DEFAULT_LAYOUT)
      } catch {
        setItems(DEFAULT_LAYOUT)
      }
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      if (loading) setLoading(true)
      
      // --- CORREÇÃO DO ERRO 400 (UUID vs ID Numérico) ---
      let companyId = null;
      const userIdStr = String(user.id);
      
      // Verifica se é ID numérico (ex: '19') ou UUID
      const isNumericId = /^\d+$/.test(userIdStr);

      if (userIdStr === '10') {
          companyId = 1; // Master hardcoded
      } else {
          // Se for numérico, busca pela coluna 'id'. Se for UUID, busca por 'auth_user_id'
          const searchCol = isNumericId ? 'id' : 'auth_user_id';
          
          const { data: emp } = await supabase
            .from('employees')
            .select('company_id')
            .eq(searchCol, userIdStr)
            .maybeSingle();
            
          companyId = emp?.company_id || user.user_metadata?.company_id;
      }

      if (!companyId) {
          console.warn("Empresa não identificada para o usuário", userIdStr);
          setLoading(false);
          return;
      }
      // ----------------------------------------------------

      const start = `${dateRange.start}T00:00:00`
      const end = `${dateRange.end}T23:59:59`

      const date1 = new Date(dateRange.start);
      const date2 = new Date(dateRange.end);
      const daysDiff = Math.max(1, Math.ceil((date2 - date1) / (1000 * 60 * 60 * 24)) + 1);

      const [
        { data: sales },
        { data: allProducts },
        { count: cashierCount },
        { count: tablesCount },
        { data: kdsItems }
      ] = await Promise.all([
        supabase.from('sales')
          .select(`
            *, 
            sale_payments(payment_method, amount),
            sale_items(quantity, total, product_name)
          `)
          .eq('company_id', companyId)
          .gte('created_at', start)
          .lte('created_at', end)
          .neq('status', 'cancelado')
          .neq('status', 'CANCELLED'),
        
        supabase.from('products').select('stock_quantity, min_stock_quantity').eq('company_id', companyId).eq('active', true),
        supabase.from('cashier_sessions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
        supabase.from('sales').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('channel', 'IFOOD').eq('status', 'aberto'),
        supabase.from('sale_items').select('status, product:products(destination)').eq('company_id', companyId).in('status', ['pendente', 'pending', 'preparando', 'preparing']).gte('created_at', start).lte('created_at', end)
      ])

      const validSales = sales || []
      
      let revenuePaid = 0;
      let revenueOpen = 0;

      const hoursMap = {}
      const dailySalesMap = {}
      const ifoodDayMap = {}
      const payMap = {}
      const prodMap = {} 

      validSales.forEach(s => {
          const val = Number(s.total);
          
          if (s.status === 'concluido' || s.status === 'completed') {
              revenuePaid += val;
          } else {
              revenueOpen += val;
          }

          const dateStr = new Date(s.created_at).toLocaleDateString('pt-BR');
          const h = new Date(s.created_at).getHours();

          if (!dailySalesMap[dateStr]) dailySalesMap[dateStr] = { date: dateStr, total: 0, ifood: 0, loja: 0 };
          dailySalesMap[dateStr].total += val;

          if (!hoursMap[h]) hoursMap[h] = { hour: h, local: 0, ifood: 0 };
          
          if (s.channel === 'IFOOD') {
              hoursMap[h].ifood += val;
              ifoodDayMap[dateStr] = (ifoodDayMap[dateStr] || 0) + val;
              dailySalesMap[dateStr].ifood += val;
          } else {
              hoursMap[h].local += val;
              dailySalesMap[dateStr].loja += val;
          }

          if (s.status !== 'concluido' && s.status !== 'completed') {
              payMap['AGUARDANDO PAGTO'] = (payMap['AGUARDANDO PAGTO'] || 0) + val;
          } else {
              if (s.sale_payments && s.sale_payments.length > 0) {
                  s.sale_payments.forEach(sp => {
                      const method = (sp.payment_method || 'NÃO IDENTIFICADO').toUpperCase();
                      payMap[method] = (payMap[method] || 0) + Number(sp.amount);
                  })
              } else {
                  let method = s.payment_method;
                  if (!method && s.channel === 'IFOOD') method = 'IFOOD APP'; 
                  if (!method) method = 'NÃO IDENTIFICADO';
                  payMap[method.toUpperCase()] = (payMap[method.toUpperCase()] || 0) + val;
              }
          }

          // --- PROCESSAMENTO DE TOP PRODUTOS (COM QUANTIDADE) ---
          if (s.sale_items && s.sale_items.length > 0) {
              s.sale_items.forEach(item => {
                  const name = item.product_name || 'Item sem nome';
                  const itemVal = Number(item.total) || 0;
                  const itemQty = Number(item.quantity) || 0; 

                  if (!prodMap[name]) {
                      prodMap[name] = { total: 0, quantity: 0 };
                  }
                  
                  prodMap[name].total += itemVal;
                  prodMap[name].quantity += itemQty;
              });
          }
      });

      const totalRevenue = revenuePaid + revenueOpen;

      let lowStock = 0;
      if (allProducts) {
        lowStock = allProducts.filter(p => {
          const current = Number(p.stock_quantity || 0);
          const min = Number(p.min_stock_quantity || 0);
          return min > 0 && current < min;
        }).length;
      }

      const kdsMetrics = { kitchenQueue: 0, kitchenPrep: 0, barQueue: 0, barPrep: 0 }
      kdsItems?.forEach(item => {
        const dest = item.product?.destination?.toLowerCase() || 'cozinha'
        const isBar = dest.includes('bar') || dest.includes('copa')
        const status = (item.status || '').toLowerCase()
        const isPrep = status === 'preparando' || status === 'preparing'
        if (isBar) { if (isPrep) kdsMetrics.barPrep++; else kdsMetrics.barQueue++; } 
        else { if (isPrep) kdsMetrics.kitchenPrep++; else kdsMetrics.kitchenQueue++; }
      })

      const localSales = validSales.filter(s => s.channel !== 'IFOOD');
      const ifoodSales = validSales.filter(s => s.channel === 'IFOOD');
      const tmLocal = localSales.length ? localSales.reduce((a,b)=>a+Number(b.total),0) / localSales.length : 0;
      const tmIfood = ifoodSales.length ? ifoodSales.reduce((a,b)=>a+Number(b.total),0) / ifoodSales.length : 0;

      const salesByHour = Object.values(hoursMap).map(h => ({
          hour: h.hour,
          local: h.local / daysDiff,
          ifood: h.ifood / daysDiff
      })).sort((a,b) => a.hour - b.hour);

      setMetrics({
        todayRevenue: totalRevenue,
        revenuePaid,
        revenueOpen,
        ticketMedio: validSales.length ? totalRevenue / validSales.length : 0,
        ticketMedioLocal: tmLocal,
        ticketMedioIfood: tmIfood,
        lowStockCount: lowStock,
        activeCashiers: cashierCount || 0,
        openTables: tablesCount || 0,
        totalOrders: validSales.length,
        kds: kdsMetrics
      })

      setChartsData({
        salesByHour,
        dailySales: Object.values(dailySalesMap).sort((a, b) => {
            const [dA, mA, yA] = a.date.split('/').map(Number);
            const [dB, mB, yB] = b.date.split('/').map(Number);
            return new Date(yA, mA-1, dA) - new Date(yB, mB-1, dB);
        }),
        paymentMethods: Object.keys(payMap).map(k => ({ name: k, value: payMap[k] })).sort((a,b) => b.value - a.value),
        
        topProducts: Object.entries(prodMap)
            .map(([name, data]) => ({ name, total: data.total, quantity: data.quantity }))
            .sort((a,b) => b.total - a.total)
            .slice(0, 5),
            
        ifoodSalesByDay: Object.entries(ifoodDayMap).map(([date, total]) => ({ date, total }))
      })

    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [user, dateRange, loading])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchMetrics())
      .subscribe();
    return () => { supabase.removeChannel(channel) }
  }, [fetchMetrics]);

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSaveLayout = () => {
      localStorage.setItem('hawk_dashboard_layout_v2', JSON.stringify(items))
      setIsEditing(false)
      toast.success('Layout salvo!')
  }

  return (
    <div className="p-3 md:p-6 max-w-[1920px] mx-auto min-h-screen flex flex-col pb-24 md:pb-6">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 md:mb-6 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full xl:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500">Visão Geral & Financeira</p>
        </div>
        
        {/* Barra de Ferramentas - Full width no mobile */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 w-full xl:w-auto">
            {/* Filtro de Data Flexível */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-2 px-2 border-r border-slate-200 shrink-0">
                    <Filter size={16} className="text-slate-400"/>
                    <span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase">Filtro</span>
                </div>
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={e => setDateRange(p => ({...p, start: e.target.value}))} 
                  className="bg-transparent text-xs md:text-sm outline-none flex-1 min-w-0 text-center"
                />
                <span className="text-slate-400 text-xs shrink-0">até</span>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={e => setDateRange(p => ({...p, end: e.target.value}))} 
                  className="bg-transparent text-xs md:text-sm outline-none flex-1 min-w-0 text-center"
                />
            </div>

            <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
                <button onClick={fetchMetrics} className="p-2.5 hover:bg-slate-100 rounded-lg border border-slate-200 md:border-transparent flex justify-center items-center bg-white md:bg-transparent shadow-sm md:shadow-none active:scale-95 transition-all">
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""}/>
                </button>
                <button onClick={() => isEditing ? handleSaveLayout() : setIsEditing(true)} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold shadow-sm active:scale-95 transition-all ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-900 text-white'}`}>
                    {isEditing ? <Save size={18}/> : <Settings size={18}/>}
                    {isEditing ? 'Salvar' : 'Personalizar'}
                </button>
            </div>
        </div>
      </div>

      {isEditing && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in">
           <div className="flex flex-wrap gap-2">
              <h3 className="w-full font-bold text-indigo-900 mb-2 flex items-center gap-2"><LayoutGrid size={18}/> Adicionar Widgets</h3>
              {Object.keys(WIDGET_REGISTRY).map(id => (
                 !items.includes(id) && (
                    <button key={id} onClick={() => setItems([...items, id])} className="bg-white border px-3 py-2 rounded text-sm hover:text-indigo-600 flex items-center gap-2 shadow-sm">
                        <Plus size={16}/> {WIDGET_REGISTRY[id].label}
                    </button>
                 )
              ))}
              <button onClick={() => {if(confirm('Resetar layout?')) setItems(DEFAULT_LAYOUT)}} className="ml-auto text-xs text-red-600 flex items-center gap-1 hover:underline p-2"><RotateCcw size={12}/> Resetar Padrão</button>
           </div>
        </div>
      )}

      {loading && !metrics.todayRevenue && !metrics.lowStockCount ? (
         <div className="flex-1 flex items-center justify-center text-slate-400 gap-2 min-h-[300px]"><Loader2 className="animate-spin"/> Carregando...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 pb-10">
                {items.map(id => {
                    const WidgetConfig = WIDGET_REGISTRY[id]
                    if (!WidgetConfig) return null
                    const widgetData = { ...metrics, salesByHour: chartsData.salesByHour, paymentMethods: chartsData.paymentMethods, topProducts: chartsData.topProducts, ifoodSalesByDay: chartsData.ifoodSalesByDay, dailySales: chartsData.dailySales }
                    return (
                        <SortableWidget key={id} id={id} isEditing={isEditing} onRemove={(rid) => setItems(items.filter(i => i !== rid))} colSpan={WidgetConfig.defaultColSpan}>
                            <WidgetConfig.component data={widgetData} />
                        </SortableWidget>
                    )
                })}
            </div>
            </SortableContext>
        </DndContext>
      )}
    </div>
  )
}