import { useState, useEffect } from 'react'
import { Clock, CheckCircle, ChefHat, Play, Flame, AlertCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function Cozinha() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertTime, setAlertTime] = useState(20) // Padrão 20 min

  useEffect(() => {
    // Busca configuração de tempo
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

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            quantity,
            status,
            product_name,
            product: products (name, unit, destination)
          )
        `)
        .neq('status', 'cancelado') 
        .gte('created_at', startTime)
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
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

  // Lógica de Filtragem: Se tiver item sem cadastro, mostra TUDO. Se não, só Cozinha.
  const filterForKitchen = (order, targetStatus) => {
    const hasUnmapped = order.sale_items.some(i => !i.product);
    
    return order.sale_items.filter(item => {
        // 1. Filtra pelo status desejado (pending ou preparing)
        if (item.status !== targetStatus) return false;

        // 2. Se a comanda tem item sem cadastro (iFood teste), mostra TUDO na Cozinha
        if (hasUnmapped) return true;

        // 3. Caso normal: Cozinha ou Sem destino definido
        const dest = item.product?.destination?.toLowerCase();
        return !dest || dest === 'cozinha';
    });
  };

  const pendingOrders = orders.map(order => ({
    ...order, 
    kitchenItems: filterForKitchen(order, 'pending'),
    hasUnmapped: order.sale_items.some(i => !i.product)
  })).filter(order => order.kitchenItems.length > 0) 

  const preparingOrders = orders.map(order => ({
    ...order, 
    kitchenItems: filterForKitchen(order, 'preparing'),
    hasUnmapped: order.sale_items.some(i => !i.product)
  })).filter(order => order.kitchenItems.length > 0)


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
            <p className="text-sm text-slate-500">Tempo Alerta: {alertTime} min</p>
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

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUNA 1: PENDENTES */}
        <div className="bg-slate-200/50 p-4 rounded-xl flex flex-col h-full overflow-hidden">
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
                alertTime={alertTime}
                onAction={(ids) => updateBatchStatus(ids, 'preparing')} 
                actionLabel="Iniciar Tudo" 
                actionIcon={<Play size={18}/>} 
                baseColor="blue" 
              />
            ))}
          </div>
        </div>

        {/* COLUNA 2: EM PRODUÇÃO */}
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col h-full overflow-hidden">
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
                alertTime={alertTime}
                onAction={(ids) => updateBatchStatus(ids, 'ready')} 
                actionLabel="Finalizar Tudo" 
                actionIcon={<CheckCircle size={18}/>} 
                baseColor="orange" 
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function OrderCard({ order, items, getWaitTime, alertTime, onAction, actionLabel, actionIcon, baseColor }) {
    const mins = getWaitTime(order.created_at)
    const itemIds = items.map(i => i.id)

    // LÓGICA DE CORES (GRADIENTE DE URGÊNCIA)
    const getStatusStyle = () => {
      const percentage = (mins / alertTime) * 100
      
      let style = { 
        borderClass: baseColor === 'blue' ? 'border-l-blue-500' : 'border-l-orange-500', 
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

    return (
        <div className={`p-4 rounded-lg shadow-sm border-l-4 ${s.borderClass} ${s.bgClass} transition-colors duration-500`}>
            <div className="flex justify-between items-start mb-3 border-b border-black/5 pb-2">
                <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${s.textClass}`}>
                        {order.customer_name}
                        {order.hasUnmapped && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                                <AlertTriangle size={10}/> Completo
                            </span>
                        )}
                    </h3>
                    <p className="text-xs opacity-60">Pedido #{order.id.toString().slice(0,4)}</p>
                </div>
                <div className={`flex items-center gap-1 font-bold px-2 py-1 rounded text-xs ${s.badgeClass}`}>
                    <Clock size={12} /> {mins} min
                </div>
            </div>

            <ul className="space-y-1 mb-4">
                {items?.map((item, idx) => (
                    <li key={idx} className={`flex gap-2 text-sm border-b border-black/5 pb-1 last:border-0 ${s.textClass}`}>
                        <span className="font-bold w-6">{item.quantity}x</span>
                        <span className="uppercase flex-1">{item.product?.name || item.product_name}</span>
                    </li>
                ))}
            </ul>

            <button 
                onClick={() => onAction(itemIds)}
                className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-transform active:scale-95 ${baseColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {actionIcon} {actionLabel}
            </button>
        </div>
    )
}