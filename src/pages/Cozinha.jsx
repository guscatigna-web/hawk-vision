import { useState, useEffect } from 'react'
import { Clock, CheckCircle, ChefHat, Play, Flame, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function Cozinha() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000) // Reduzi para 5s para ficar mais ágil
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      // 1. Busca o horário de abertura do caixa mais antigo que ainda está aberto (Início do Turno)
      const { data: openSessions } = await supabase
        .from('cashier_sessions')
        .select('opening_time')
        .eq('status', 'open')
        .order('opening_time', { ascending: true })
        .limit(1)
      
      let startTime;
      
      if (openSessions && openSessions.length > 0) {
        // Se tem caixa aberto, pega tudo desde a abertura desse caixa
        startTime = openSessions[0].opening_time
      } else {
        // Se NÃO tem caixa aberto (ex: só conferência), pega as últimas 24h por segurança
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)
        startTime = yesterday.toISOString()
      }

      // 2. Busca vendas baseadas no HORÁRIO (Turno), não no ID específico
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
        .neq('status', 'cancelado') 
        .gte('created_at', startTime) // Filtra pelo início do turno
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  // ATUALIZAÇÃO EM MASSA
  const updateBatchStatus = async (itemIds, newStatus) => {
      try {
        const { error } = await supabase
          .from('sale_items')
          .update({ status: newStatus })
          .in('id', itemIds)

        if (error) throw error
        toast.success(newStatus === 'preparing' ? 'Iniciando preparo! 🔥' : 'Itens prontos! 🛎️')
        fetchOrders()
      } catch (error) {
          console.error(error)
          toast.error('Erro ao atualizar lote.')
      }
  }

  const getWaitTime = (dateString) => {
    const start = new Date(dateString)
    const now = new Date()
    return Math.floor((now - start) / 60000)
  }

  // --- FILTRAGEM DE ITENS (Lógica Mantida) ---
  const pendingOrders = orders.map(order => {
    const validItems = order.sale_items.filter(item => 
      (item.status === 'pending') && 
      (!item.product?.destination || item.product?.destination === 'cozinha')
    )
    return { ...order, kitchenItems: validItems }
  }).filter(order => order.kitchenItems.length > 0) 

  const preparingOrders = orders.map(order => {
    const validItems = order.sale_items.filter(item => 
      (item.status === 'preparing') && 
      (!item.product?.destination || item.product?.destination === 'cozinha')
    )
    return { ...order, kitchenItems: validItems }
  }).filter(order => order.kitchenItems.length > 0)


  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Carregando KDS...</div>

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
            <ChefHat size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cozinha (KDS)</h1>
            <p className="text-sm text-slate-500">Visualização de Turno Ativo</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm font-bold">
            <div className="flex items-center gap-2 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Pendentes: {pendingOrders.length}
            </div>
            <div className="flex items-center gap-2 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span> Em Preparo: {preparingOrders.length}
            </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        
        {/* COLUNA 1: PENDENTES */}
        <div className="bg-slate-200/50 p-4 rounded-xl flex flex-col h-full">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 sticky top-0">
            <AlertCircle className="text-blue-600"/> Fila de Entrada
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {pendingOrders.length === 0 && (
                <div className="h-40 flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-300 rounded-lg">
                    Sem novos pedidos
                </div>
            )}
            {pendingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                items={order.kitchenItems} 
                getWaitTime={getWaitTime} 
                onAction={(ids) => updateBatchStatus(ids, 'preparing')} 
                actionLabel="Iniciar Tudo" 
                actionIcon={<Play size={18}/>} 
                color="blue" 
              />
            ))}
          </div>
        </div>

        {/* COLUNA 2: EM PRODUÇÃO */}
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col h-full">
          <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2 sticky top-0">
            <Flame className="text-orange-600"/> Em Produção
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {preparingOrders.length === 0 && (
                <div className="h-40 flex items-center justify-center text-orange-300 italic border-2 border-dashed border-orange-200 rounded-lg">
                    Fogão livre
                </div>
            )}
            {preparingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                items={order.kitchenItems} 
                getWaitTime={getWaitTime} 
                onAction={(ids) => updateBatchStatus(ids, 'ready')} 
                actionLabel="Finalizar Tudo" 
                actionIcon={<CheckCircle size={18}/>} 
                color="orange" 
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function OrderCard({ order, items, getWaitTime, onAction, actionLabel, actionIcon, color }) {
    const mins = getWaitTime(order.created_at)
    const isLate = mins > 20
    const itemIds = items.map(i => i.id)

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${color === 'blue' ? 'border-l-blue-500' : 'border-l-orange-500'} animate-fade-in`}>
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {order.customer_name}
                        {order.status === 'concluido' && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded uppercase">Pago</span>}
                    </h3>
                    <p className="text-xs text-slate-400">Pedido #{order.id.toString().slice(0,4)}</p>
                </div>
                <div className={`flex items-center gap-1 font-bold px-2 py-1 rounded text-xs ${isLate ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock size={12} /> {mins} min
                </div>
            </div>

            <ul className="space-y-1 mb-4">
                {items?.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-slate-700 border-b border-slate-50 pb-1 last:border-0">
                        <span className="font-bold w-6">{item.quantity}x</span>
                        <span className="uppercase flex-1">{item.product?.name}</span>
                    </li>
                ))}
            </ul>

            <button 
                onClick={() => onAction(itemIds)}
                className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-transform active:scale-95 ${color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {actionIcon} {actionLabel}
            </button>
        </div>
    )
}