import { useState, useEffect } from 'react'
import { Clock, CheckCircle, Beer, Play, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function Bar() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000) 
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      // Busca Pedidos ativos e seus itens com status individual
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            quantity,
            status,
            product: products (name, unit, destination)
          )
        `)
        .not('status', 'in', '("concluido","cancelado")')
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos do Bar:', error)
    } finally {
      setLoading(false)
    }
  }

  // ATUALIZAÇÃO EM MASSA (GRANULARIDADE POR ITEM)
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
    const start = new Date(dateString)
    const now = new Date()
    return Math.floor((now - start) / 60000)
  }

  // --- FILTRAGEM INTELIGENTE (BAR) ---

  // 1. Filtra Itens PENDENTES do Bar
  const pendingOrders = orders.map(order => {
    const validItems = order.sale_items.filter(item => 
      (item.status === 'pending') && 
      (item.product?.destination === 'bar') // Apenas itens de Bar
    )
    return { ...order, barItems: validItems }
  }).filter(order => order.barItems.length > 0)

  // 2. Filtra Itens EM PREPARO do Bar
  const preparingOrders = orders.map(order => {
    const validItems = order.sale_items.filter(item => 
      (item.status === 'preparing') && 
      (item.product?.destination === 'bar')
    )
    return { ...order, barItems: validItems }
  }).filter(order => order.barItems.length > 0)

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando Bar...</div>

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      
      {/* HEADER (Roxo para diferenciar da Cozinha) */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <Beer size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">KDS Bar / Copa</h1>
            <p className="text-sm text-slate-500">Fila de bebidas e drinks</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm font-bold">
            <div className="flex items-center gap-2 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Pendentes: {pendingOrders.length}
            </div>
            <div className="flex items-center gap-2 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span> Preparando: {preparingOrders.length}
            </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        
        {/* COLUNA 1: NOVOS (PENDING) */}
        <div className="bg-slate-200/50 p-4 rounded-xl flex flex-col h-full">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 sticky top-0">
            <AlertCircle className="text-blue-600"/> Fila de Entrada
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {pendingOrders.length === 0 && (
                <div className="h-40 flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-300 rounded-lg">
                    Sem pedidos no bar
                </div>
            )}
            {pendingOrders.map(order => (
              <BarOrderCard 
                key={order.id} 
                order={order} 
                items={order.barItems} // Passa apenas itens pendentes
                getWaitTime={getWaitTime} 
                onAction={(ids) => updateBatchStatus(ids, 'preparing')} 
                actionLabel="Preparar" 
                actionIcon={<Play size={18}/>} 
                color="blue" 
              />
            ))}
          </div>
        </div>

        {/* COLUNA 2: PREPARANDO (PREPARING) */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col h-full">
          <h2 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2 sticky top-0">
            <Beer className="text-purple-600"/> Preparando
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {preparingOrders.length === 0 && (
                <div className="h-40 flex items-center justify-center text-purple-300 italic border-2 border-dashed border-purple-200 rounded-lg">
                    Nenhum drink sendo feito
                </div>
            )}
            {preparingOrders.map(order => (
              <BarOrderCard 
                key={order.id} 
                order={order} 
                items={order.barItems} // Passa apenas itens preparando
                getWaitTime={getWaitTime} 
                onAction={(ids) => updateBatchStatus(ids, 'ready')} // Move para 'ready' (some da tela)
                actionLabel="Pronto" 
                actionIcon={<CheckCircle size={18}/>} 
                color="purple" 
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function BarOrderCard({ order, items, getWaitTime, onAction, actionLabel, actionIcon, color }) {
    const mins = getWaitTime(order.created_at)
    const btnColor = color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
    const border = color === 'blue' ? 'border-l-blue-500' : 'border-l-purple-500'
    const itemIds = items.map(i => i.id)

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${border} animate-fade-in`}>
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{order.customer_name}</h3>
                    <p className="text-xs text-slate-400">Pedido #{order.id.toString().slice(0,4)}</p>
                </div>
                <div className="flex items-center gap-1 font-bold px-2 py-1 rounded text-xs bg-slate-100 text-slate-600">
                    <Clock size={12} /> {mins} min
                </div>
            </div>

            <ul className="space-y-2 mb-4">
                {items.map((item, idx) => (
                    <li key={idx} className="flex justify-between text-sm text-slate-700 border-b border-slate-50 pb-1 last:border-0">
                        <span className="uppercase font-medium">{item.product?.name}</span>
                        <span className="font-bold bg-slate-100 px-2 rounded">{item.quantity}</span>
                    </li>
                ))}
            </ul>

            <button 
                onClick={() => onAction(itemIds)} 
                className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all ${btnColor}`}
            >
                {actionIcon} {actionLabel}
            </button>
        </div>
    )
}