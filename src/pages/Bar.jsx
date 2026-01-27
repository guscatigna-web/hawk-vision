import { useState, useEffect } from 'react'
import { Clock, CheckCircle, Beer, Play, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function Bar() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertTime, setAlertTime] = useState(20) // Padrão 20 min

  useEffect(() => {
    // Busca config de tempo
    async function fetchConfig() {
      const { data } = await supabase.from('company_settings').select('kds_alert_time').limit(1).maybeSingle()
      if (data?.kds_alert_time) setAlertTime(data.kds_alert_time)
    }
    fetchConfig()

    fetchOrders()
    const interval = setInterval(fetchOrders, 5000) 
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      const { data: openSessions } = await supabase
        .from('cashier_sessions')
        .select('opening_time')
        .eq('status', 'open')
        .order('opening_time', { ascending: true })
        .limit(1)
      
      let startTime;
      if (openSessions && openSessions.length > 0) {
        startTime = openSessions[0].opening_time
      } else {
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)
        startTime = yesterday.toISOString()
      }

      // ATUALIZADO: Inclui created_at dos ITENS
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            quantity,
            status,
            created_at,
            product: products (name, unit, destination)
          )
        `)
        .neq('status', 'cancelado') 
        .gte('created_at', startTime) 
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos do Bar:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBatchStatus = async (itemIds, newStatus) => {
    try {
      const { error } = await supabase
        .from('sale_items')
        .update({ status: newStatus })
        .in('id', itemIds)

      if (error) throw error
      toast.success(newStatus === 'preparing' ? 'Preparando drinks! 🍹' : 'Bebidas prontas! 🛎️')
      fetchOrders()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar.')
    }
  }

  const getWaitTime = (dateString) => {
    if (!dateString) return 0
    const start = new Date(dateString)
    const now = new Date()
    return Math.floor((now - start) / 60000)
  }

  // Helper: Pega a hora do item mais antigo do lote
  const getBatchStartTime = (items) => {
    if (!items || items.length === 0) return new Date().toISOString()
    const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return sorted[0].created_at
  }

  const pendingOrders = orders.map(order => {
    const validItems = order.sale_items.filter(item => 
      (item.status === 'pending') && 
      (item.product?.destination === 'bar')
    )
    return { 
        ...order, 
        barItems: validItems,
        batchTime: getBatchStartTime(validItems) 
    }
  }).filter(order => order.barItems.length > 0)

  const preparingOrders = orders.map(order => {
    const validItems = order.sale_items.filter(item => 
      (item.status === 'preparing') && 
      (item.product?.destination === 'bar')
    )
    return { 
        ...order, 
        barItems: validItems,
        batchTime: getBatchStartTime(validItems)
    }
  }).filter(order => order.barItems.length > 0)

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando Bar...</div>

  return (
    // AJUSTE MOBILE: h-[calc(100dvh-5rem)] e pb-20
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100vh-2rem)] flex flex-col gap-3 md:gap-4 pb-20 md:pb-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <Beer size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">KDS Bar / Copa</h1>
            <p className="text-xs md:text-sm text-slate-500">Tempo Alerta: {alertTime} min</p>
          </div>
        </div>
        
        {/* Badges alinhados */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto text-sm font-bold">
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Pendentes: {pendingOrders.length}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Preparando: {preparingOrders.length}
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* COLUNA 1: PENDENTES */}
        <div className="bg-slate-200/50 p-3 md:p-4 rounded-xl flex flex-col h-full overflow-hidden border border-slate-300/50">
          <h2 className="text-base md:text-lg font-bold text-slate-700 mb-3 flex items-center gap-2 sticky top-0">
            <AlertCircle className="text-blue-600" size={20}/> Fila de Entrada
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 md:pr-2 custom-scrollbar">
            {pendingOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-sm">
                    <AlertCircle className="mb-2 opacity-50"/> Sem pedidos no bar
                </div>
            )}
            {pendingOrders.map(order => (
              <BarOrderCard 
                key={order.id} 
                order={order} 
                items={order.barItems} 
                startTime={order.batchTime} 
                getWaitTime={getWaitTime} 
                alertTime={alertTime}
                onAction={(ids) => updateBatchStatus(ids, 'preparing')} 
                actionLabel="Preparar" 
                actionIcon={<Play size={16}/>} 
                baseColor="blue" 
              />
            ))}
          </div>
        </div>

        {/* COLUNA 2: PREPARANDO */}
        <div className="bg-purple-50 p-3 md:p-4 rounded-xl border border-purple-100 flex flex-col h-full overflow-hidden">
          <h2 className="text-base md:text-lg font-bold text-purple-800 mb-3 flex items-center gap-2 sticky top-0">
            <Beer className="text-purple-600" size={20}/> Preparando
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 md:pr-2 custom-scrollbar">
            {preparingOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-purple-300 italic border-2 border-dashed border-purple-200 rounded-lg p-4 text-center text-sm">
                    <Beer className="mb-2 opacity-50"/> Nenhum drink sendo feito
                </div>
            )}
            {preparingOrders.map(order => (
              <BarOrderCard 
                key={order.id} 
                order={order} 
                items={order.barItems} 
                startTime={order.batchTime} 
                getWaitTime={getWaitTime} 
                alertTime={alertTime}
                onAction={(ids) => updateBatchStatus(ids, 'ready')} 
                actionLabel="Pronto" 
                actionIcon={<CheckCircle size={16}/>} 
                baseColor="purple" 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BarOrderCard({ order, items, startTime, getWaitTime, alertTime, onAction, actionLabel, actionIcon, baseColor }) {
    // Usa tempo do lote de itens
    const mins = getWaitTime(startTime || order.created_at)
    const itemIds = items.map(i => i.id)

    // LÓGICA DE CORES (GRADIENTE DE URGÊNCIA)
    const getStatusStyle = () => {
      const percentage = (mins / alertTime) * 100
      
      let style = { 
        borderClass: baseColor === 'blue' ? 'border-l-blue-500' : 'border-l-purple-500', 
        bgClass: 'bg-white', 
        badgeClass: 'bg-slate-100 text-slate-600',
        textClass: 'text-slate-800'
      }

      if (percentage >= 100) {
        style = { borderClass: 'border-l-red-600', bgClass: 'bg-red-50 animate-pulse', badgeClass: 'bg-red-600 text-white', textClass: 'text-red-900' }
      } else if (percentage >= 50) {
        style = { borderClass: 'border-l-yellow-500', bgClass: 'bg-yellow-50', badgeClass: 'bg-yellow-500 text-white', textClass: 'text-yellow-900' }
      }

      return style
    }

    const s = getStatusStyle()
    const btnColor = baseColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'

    return (
        <div className={`p-3 md:p-4 rounded-lg shadow-sm border-l-4 ${s.borderClass} ${s.bgClass} transition-colors duration-500`}>
            <div className="flex justify-between items-start mb-2 md:mb-3 border-b border-black/5 pb-2">
                <div>
                    <h3 className={`text-base md:text-xl font-bold flex items-center gap-2 ${s.textClass}`}>
                      {order.customer_name}
                      {order.status === 'concluido' && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded uppercase">Pago</span>}
                    </h3>
                    <p className="text-[10px] md:text-xs opacity-60">Pedido #{order.id.toString().slice(0,4)}</p>
                </div>
                <div className={`flex items-center gap-1 font-bold px-2 py-1 rounded text-xs whitespace-nowrap ${s.badgeClass}`}>
                    <Clock size={12} /> {mins} min
                </div>
            </div>

            <ul className="space-y-1 mb-3">
                {items.map((item, idx) => (
                    <li key={idx} className={`flex justify-between text-sm border-b border-black/5 pb-1 last:border-0 ${s.textClass}`}>
                        <span className="uppercase font-medium flex-1">{item.product?.name}</span>
                        <span className="font-bold bg-black/5 px-2 rounded ml-2">{item.quantity}</span>
                    </li>
                ))}
            </ul>

            <button 
                onClick={() => onAction(itemIds)} 
                className={`w-full py-2.5 md:py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all text-sm md:text-base ${btnColor}`}
            >
                {actionIcon} {actionLabel}
            </button>
        </div>
    )
}