import { useEffect, useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { Settings, Plus, Save, RotateCcw, Loader2, LayoutGrid, Filter, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase' 
import { WIDGET_REGISTRY } from '../components/dashboard/widgetConfig'
import { SortableWidget } from '../components/dashboard/SortableWidget'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_LAYOUT = ['revenue', 'orders', 'tables', 'stock', 'salesChart', 'ifoodChart', 'paymentChart', 'topProducts']

export default function Dashboard() {
  const { user } = useAuth()
  
  // Filtro de Data
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // Métricas
  const [metrics, setMetrics] = useState({ 
    todayRevenue: 0, 
    ticketMedio: 0, 
    lowStockCount: 0, 
    activeCashiers: 0,
    openTables: 0,
    totalOrders: 0,
    kds: { kitchenQueue: 0, kitchenPrep: 0, barQueue: 0, barPrep: 0 }
  })
  
  const [chartsData, setChartsData] = useState({ salesByHour: [], paymentMethods: [], topProducts: [], ifoodSalesByDay: [] })
  
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState(DEFAULT_LAYOUT)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Carregar Layout
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
      setLoading(true)
      
      let companyId = null;
      if (String(user.id) === '10') {
          companyId = 1; 
      } else {
          const { data: emp } = await supabase.from('employees').select('company_id').eq('auth_user_id', user.id).maybeSingle();
          companyId = emp?.company_id || user.user_metadata?.company_id;
      }
      if (!companyId) throw new Error("Empresa não identificada");

      const start = `${dateRange.start}T00:00:00`
      const end = `${dateRange.end}T23:59:59`

      // --- QUERIES ---
      const [
        { data: sales }, // Vendas
        { data: saleItems }, // Itens
        { data: allProducts }, // Produtos (Para cálculo de estoque)
        { count: cashierCount }, // Caixas
        { count: tablesCount }, // Mesas
        { data: kdsItems } // KDS
      ] = await Promise.all([
        supabase.from('sales').select('*').eq('company_id', companyId).gte('created_at', start).lte('created_at', end).neq('status', 'CANCELLED'),
        supabase.from('sale_items').select('quantity, product:products(name)').eq('company_id', companyId).gte('created_at', start).lte('created_at', end),
        
        // Busca TODOS os produtos ativos para calcular via JS com segurança
        supabase.from('products').select('stock_quantity, min_stock_quantity').eq('company_id', companyId).eq('active', true),

        supabase.from('cashier_sessions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
        
        // Mesas: Status 'aberto' e não delivery
        supabase.from('sales').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('channel', 'IFOOD').eq('status', 'aberto'),

        supabase.from('sale_items')
          .select('status, product:products(destination)')
          .eq('company_id', companyId)
          .in('status', ['pendente', 'preparando'])
          .gte('created_at', start) 
          .lte('created_at', end)
      ])

      // --- PROCESSAMENTO ---
      const validSales = sales || []
      const revenue = validSales.reduce((acc, s) => acc + Number(s.total), 0)
      const ticketMedio = validSales.length ? revenue / validSales.length : 0

      // CÁLCULO DE ESTOQUE (Lógica Refinada)
      let lowStock = 0;
      if (allProducts) {
        lowStock = allProducts.filter(p => {
          const current = Number(p.stock_quantity || 0);
          const min = Number(p.min_stock_quantity || 0);
          
          // Regra: Só alerta se tiver um mínimo definido (>0) E o estoque for menor
          return min > 0 && current < min;
        }).length;
      }

      // KDS Metrics
      const kdsMetrics = { kitchenQueue: 0, kitchenPrep: 0, barQueue: 0, barPrep: 0 }
      kdsItems?.forEach(item => {
        const dest = item.product?.destination?.toLowerCase() || 'cozinha'
        if (dest.includes('bar') || dest.includes('copa')) {
           kdsMetrics.barQueue++
        } else {
           kdsMetrics.kitchenQueue++
        }
      })

      // Gráficos Vendas
      const hoursMap = {}
      const ifoodDayMap = {}

      validSales.forEach(s => {
          const h = new Date(s.created_at).getHours()
          if (!hoursMap[h]) hoursMap[h] = { hour: h, local: 0, ifood: 0 }
          
          const val = Number(s.total)
          if (s.channel === 'IFOOD') {
              hoursMap[h].ifood += val
              const d = new Date(s.created_at).toLocaleDateString('pt-BR')
              ifoodDayMap[d] = (ifoodDayMap[d] || 0) + val
          } else {
              hoursMap[h].local += val
          }
      })

      // Pagamentos
      const payMap = {}
      validSales.forEach(s => {
          let method = s.payment_method;
          // Tenta inferir se for nulo, mas prioriza o dado real
          if (!method && s.channel === 'IFOOD') method = 'iFood App';
          if (!method) method = 'Não Identificado';
          
          method = method.toUpperCase();
          payMap[method] = (payMap[method] || 0) + Number(s.total)
      })

      // Top Produtos
      const prodMap = {}
      saleItems?.forEach(i => {
          const n = i.product?.name || 'Item Genérico'
          prodMap[n] = (prodMap[n] || 0) + i.quantity
      })

      setMetrics({
        todayRevenue: revenue,
        ticketMedio,
        totalOrders: validSales.length,
        lowStockCount: lowStock,
        activeCashiers: cashierCount || 0,
        openTables: tablesCount || 0,
        kds: kdsMetrics
      })

      setChartsData({
        salesByHour: Object.values(hoursMap).sort((a,b) => a.hour - b.hour),
        paymentMethods: Object.keys(payMap).map(k => ({ name: k, value: payMap[k] })),
        topProducts: Object.entries(prodMap).map(([name, qtd]) => ({ name, qtd })).sort((a,b) => b.qtd - a.qtd).slice(0, 5),
        ifoodSalesByDay: Object.entries(ifoodDayMap).map(([date, total]) => ({ date, total }))
      })

    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [user, dateRange])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

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
    <div className="p-6 max-w-[1920px] mx-auto min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão Geral</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                    <Filter size={16} className="text-slate-400"/>
                    <span className="text-xs font-bold text-slate-600">FILTRO</span>
                </div>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="bg-transparent text-sm outline-none w-32"/>
                <span className="text-slate-400">até</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="bg-transparent text-sm outline-none w-32"/>
            </div>

            <button onClick={fetchMetrics} className="p-2 hover:bg-slate-100 rounded-lg"><RefreshCw size={20} className={loading ? "animate-spin" : ""}/></button>
            <button onClick={() => isEditing ? handleSaveLayout() : setIsEditing(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-900 text-white'}`}>
                {isEditing ? <Save size={18}/> : <Settings size={18}/>}
                {isEditing ? 'Salvar' : 'Personalizar'}
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in">
           <div className="flex flex-wrap gap-2">
              <h3 className="w-full font-bold text-indigo-900 mb-2 flex items-center gap-2"><LayoutGrid size={18}/> Adicionar Widgets</h3>
              {Object.keys(WIDGET_REGISTRY).map(id => (
                 !items.includes(id) && (
                    <button key={id} onClick={() => setItems([...items, id])} className="bg-white border px-3 py-2 rounded text-sm hover:text-indigo-600 flex items-center gap-2">
                        <Plus size={16}/> {WIDGET_REGISTRY[id].label}
                    </button>
                 )
              ))}
              <button onClick={() => {if(confirm('Resetar layout?')) setItems(DEFAULT_LAYOUT)}} className="ml-auto text-xs text-red-600 flex items-center gap-1 hover:underline"><RotateCcw size={12}/> Resetar Padrão</button>
           </div>
        </div>
      )}

      {loading && !metrics.todayRevenue && !metrics.lowStockCount ? (
         <div className="flex-1 flex items-center justify-center text-slate-400 gap-2"><Loader2 className="animate-spin"/> Carregando...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-10">
                {items.map(id => {
                    const WidgetConfig = WIDGET_REGISTRY[id]
                    if (!WidgetConfig) return null
                    const widgetData = { ...metrics, salesByHour: chartsData.salesByHour, paymentMethods: chartsData.paymentMethods, topProducts: chartsData.topProducts, ifoodSalesByDay: chartsData.ifoodSalesByDay }
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