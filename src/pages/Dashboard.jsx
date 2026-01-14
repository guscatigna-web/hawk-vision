import { useEffect, useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { Printer, Settings, Plus, Save, RotateCcw, Loader2, LayoutGrid } from 'lucide-react'
import { supabase } from '../lib/supabase' 
import { PrintPortal, CustomerReceipt } from '../components/Receipts' 
import { WIDGET_REGISTRY } from '../components/dashboard/widgetConfig'
import { SortableWidget } from '../components/dashboard/SortableWidget'
import toast from 'react-hot-toast'

// Layout Padrão Atualizado
const DEFAULT_LAYOUT = ['revenue', 'orders', 'tables', 'stock', 'salesChart', 'paymentChart', 'topProducts']

export function Dashboard() {
  const [metrics, setMetrics] = useState({ 
    todayRevenue: 0, 
    ticketMedio: 0, 
    lowStockCount: 0, 
    activeCashiers: 0,
    openTables: 0,
    // Nova Estrutura KDS
    kds: { kitchenQueue: 0, kitchenPrep: 0, barQueue: 0, barPrep: 0 }
  })
  
  const [chartsData, setChartsData] = useState({ salesByHour: [], paymentMethods: [], topProducts: [] })
  const [loading, setLoading] = useState(true)
  const [printingOrder, setPrintingOrder] = useState(null)

  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('hawk_dashboard_layout')
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT
  })
  const [availableWidgets, setAvailableWidgets] = useState([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const allIds = Object.keys(WIDGET_REGISTRY)
    const currentIds = items
    setAvailableWidgets(allIds.filter(id => !currentIds.includes(id)))
  }, [items])

  async function fetchDashboardData() {
    try {
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
  
        // 1. FATURAMENTO
        const { data: salesData } = await supabase.from('sales').select('total, created_at, status').gte('created_at', startOfDay).lte('created_at', endOfDay)
        const completedSales = (salesData || []).filter(sale => sale.status === 'concluido')
        const todayRevenue = completedSales.reduce((acc, curr) => acc + (curr.total || 0), 0)
        const ticketMedio = completedSales.length > 0 ? todayRevenue / completedSales.length : 0
        
        const hoursMap = {}
        completedSales.forEach(sale => {
          const hour = new Date(sale.created_at).getHours()
          hoursMap[hour] = (hoursMap[hour] || 0) + sale.total
        })
        const salesByHour = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, valor: hoursMap[i] || 0 }))
  
        // 2. PAGAMENTOS
        const { data: paymentsData } = await supabase.from('sale_payments').select(`amount, payment_method, sale: sales!inner (status, created_at)`).eq('sale.status', 'concluido').gte('sale.created_at', startOfDay).lte('sale.created_at', endOfDay)
        const paymentsMap = {}
        if (paymentsData) paymentsData.forEach(p => { const method = p.payment_method || 'Outros'; const label = method.charAt(0).toUpperCase() + method.slice(1); paymentsMap[label] = (paymentsMap[label] || 0) + Number(p.amount) })
        const paymentMethods = Object.keys(paymentsMap).map(key => ({ name: key, value: paymentsMap[key] }))
  
        // 3. KDS DETALHADO (COZINHA vs BAR)
        const { data: kdsItems } = await supabase
          .from('sale_items')
          .select('status, product: products(destination)')
          .in('status', ['pending', 'preparing'])
        
        let kitchenQueue = 0, kitchenPrep = 0, barQueue = 0, barPrep = 0;
        
        if (kdsItems) {
            kdsItems.forEach(item => {
                const dest = item.product?.destination || 'cozinha'
                const status = item.status
                
                if (dest === 'bar') {
                    if (status === 'pending') barQueue++
                    else barPrep++
                } else {
                    if (status === 'pending') kitchenQueue++
                    else kitchenPrep++
                }
            })
        }

        // 4. OUTROS KPIS
        const { count: activeTables } = await supabase.from('sales').select('*', { count: 'exact', head: true }).eq('status', 'aberto').not('table_number', 'is', null)
        const { data: productsData } = await supabase.from('products').select('stock_quantity, min_stock_quantity').eq('track_stock', true)
        const lowStockCount = productsData ? productsData.filter(p => p.stock_quantity <= (p.min_stock_quantity || 0)).length : 0
        const { count: activeCashiers } = await supabase.from('cashier_sessions').select('*', { count: 'exact', head: true }).eq('status', 'open')
  
        // 5. TOP PRODUTOS
        const { data: itemsData } = await supabase.from('sale_items').select(`quantity, product: products (name), sales!inner (status, created_at)`).eq('sales.status', 'concluido').gte('sales.created_at', startOfDay).lte('sales.created_at', endOfDay)
        const productMap = {}
        if (itemsData) itemsData.forEach(item => { const prodName = item.product?.name || 'Item Removido'; productMap[prodName] = (productMap[prodName] || 0) + item.quantity })
        const topProducts = Object.entries(productMap).map(([name, qtd]) => ({ name, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
  
        setMetrics({ 
          todayRevenue, 
          ticketMedio, 
          lowStockCount, 
          activeCashiers,
          openTables: activeTables || 0,
          kds: { kitchenQueue, kitchenPrep, barQueue, barPrep } // Nova métrica composta
        })
        setChartsData({ salesByHour, paymentMethods, topProducts })
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  // --- LÓGICA DE DND ---
  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function handleSaveLayout() {
    localStorage.setItem('hawk_dashboard_layout', JSON.stringify(items))
    setIsEditing(false)
    toast.success("Layout salvo!")
  }

  function handleResetLayout() {
    setItems(DEFAULT_LAYOUT)
    localStorage.removeItem('hawk_dashboard_layout')
    toast("Layout restaurado para o padrão")
  }

  function handleRemoveWidget(id) {
    setItems(prev => prev.filter(item => item !== id))
  }

  function handleAddWidget(id) {
    setItems(prev => [...prev, id])
  }

  function handleTestPrint() {
    const fakeOrder = { id: 'TESTE', total: 0, items: [] } 
    setPrintingOrder(fakeOrder)
    setTimeout(() => { window.print(); setTimeout(() => setPrintingOrder(null), 1000) }, 500)
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {printingOrder && <PrintPortal><CustomerReceipt order={printingOrder} company={{ trade_name: 'Hawk Vision' }} /></PrintPortal>}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Dashboard Gerencial
            {isEditing && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200">MODO EDIÇÃO</span>}
          </h1>
          <p className="text-sm text-slate-500 capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button onClick={handleTestPrint} className="no-print btn-secondary text-xs px-3 py-2"><Printer size={16} className="mr-2"/> Testar Print</button>
                <button onClick={() => setIsEditing(true)} className="no-print btn-secondary text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700"><Settings size={16} className="mr-2"/> Personalizar</button>
              </>
            ) : (
              <>
                <button onClick={handleResetLayout} className="btn-secondary text-xs px-3 py-2 text-slate-500"><RotateCcw size={16} className="mr-2"/> Restaurar</button>
                <button onClick={handleSaveLayout} className="btn-primary text-xs px-4 py-2 bg-green-600 hover:bg-green-700"><Save size={16} className="mr-2"/> Salvar Layout</button>
              </>
            )}
        </div>
      </div>

      {/* ÁREA DE ADICIONAR WIDGETS */}
      {isEditing && availableWidgets.length > 0 && (
        <div className="bg-slate-100 border-2 border-dashed border-slate-300 p-4 rounded-xl animate-fade-in">
          <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><LayoutGrid size={14}/> Widgets Disponíveis (Clique para adicionar)</p>
          <div className="flex flex-wrap gap-2">
            {availableWidgets.map(id => (
              <button 
                key={id}
                onClick={() => handleAddWidget(id)}
                className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
              >
                <Plus size={16}/> {WIDGET_REGISTRY[id].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GRID DND */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(id => {
              const WidgetConfig = WIDGET_REGISTRY[id]
              if (!WidgetConfig) return null
              
              const widgetData = {
                ...metrics,
                salesByHour: chartsData.salesByHour,
                paymentMethods: chartsData.paymentMethods,
                topProducts: chartsData.topProducts
              }

              return (
                <SortableWidget 
                  key={id} 
                  id={id} 
                  isEditing={isEditing}
                  onRemove={handleRemoveWidget}
                  colSpan={WidgetConfig.defaultColSpan}
                >
                  <WidgetConfig.component data={widgetData} />
                </SortableWidget>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

    </div>
  )
}