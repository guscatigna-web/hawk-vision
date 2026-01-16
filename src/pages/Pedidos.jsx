import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Bike, Ban, MapPin, Receipt, ChevronRight, Volume2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Pedidos() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(false)

  // Status mapeados
  const columns = {
    pending: { label: '🔔 Pendentes', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    preparing: { label: '👨‍🍳 Em Preparo', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    delivery: { label: '🛵 Em Entrega', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
    completed: { label: '✅ Concluídos', color: 'bg-green-100 border-green-300 text-green-800' },
    // Mantive a coluna debug por segurança, mas agora deve ficar vazia
    debug: { label: '❓ Status Desconhecido', color: 'bg-gray-100 border-gray-300 text-gray-800' }
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('sales-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
         console.log("⚡ Mudança Real-time:", payload)
         fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchOrders() {
    try {
      // Mantive sem filtro de data para você continuar vendo os testes
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            quantity,
            unit_price,
            product:products(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const enableAudio = () => {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    audio.play().then(() => {
        toast.success("Som Ativado!")
        setAudioEnabled(true)
    }).catch(e => {
        console.error("Erro audio:", e)
        toast.error("Erro ao ativar som")
    })
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      
      toast.success(`Movido para: ${newStatus}`)
      fetchOrders()

    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar status')
    }
  }

  // --- AQUI ESTAVA O SEGREDO ---
  const getColumnOrders = (columnKey) => {
    return orders.filter(o => {
      const s = (o.status || '').toLowerCase().trim()
      
      // 1. Pendentes (Adicionado 'pending')
      if (columnKey === 'pending') {
        return ['pendente', 'placed', 'plc', 'pending', 'new'].includes(s)
      }
      
      // 2. Preparo (Adicionado 'preparing')
      if (columnKey === 'preparing') {
        return ['em preparo', 'confirmed', 'cfm', 'preparando', 'preparing'].includes(s)
      }
      
      // 3. Entrega (Adicionado 'ready_to_pickup' e 'delivery')
      if (columnKey === 'delivery') {
        return ['saiu para entrega', 'dispatched', 'dsp', 'entrega', 'delivery', 'ready_to_pickup'].includes(s)
      }
      
      // 4. Concluído
      if (columnKey === 'completed') {
        return ['concluido', 'concluded', 'con', 'entregue', 'completed'].includes(s)
      }
      
      // 5. Debug (Pega o que sobrar)
      if (columnKey === 'debug') {
        const allKnown = [
            'pendente', 'placed', 'plc', 'pending', 'new',
            'em preparo', 'confirmed', 'cfm', 'preparando', 'preparing',
            'saiu para entrega', 'dispatched', 'dsp', 'entrega', 'delivery', 'ready_to_pickup',
            'concluido', 'concluded', 'con', 'entregue', 'completed',
            'cancelado', 'cancelled' // Ignora cancelados na tela
        ]
        // Retorna true se NÃO estiver na lista de conhecidos (e não for cancelado)
        return !allKnown.includes(s) && !['cancelado', 'cancelled'].includes(s)
      }
      return false
    })
  }

  if (loading) return <div className="p-8 text-center">Carregando pedidos...</div>

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gerenciador de Pedidos</h1>
        
        <div className="flex gap-2">
            {!audioEnabled && (
                <button onClick={enableAudio} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 transition-colors">
                    <Volume2 size={16}/> Ativar Som
                </button>
            )}
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                <Bike size={16}/> iFood Online
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full min-w-[1200px]">
          
          {Object.entries(columns).map(([key, col]) => (
            <div key={key} className={`flex-1 flex flex-col rounded-xl border h-full max-h-full ${col.color.split(' ')[0]} ${col.color.replace('text-', 'border-').split(' ')[1]}`}>
              <div className="p-3 border-b border-black/5 font-bold flex justify-between items-center">
                <span className={col.color.split(' ')[2]}>{col.label}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-black/60 font-mono">
                  {getColumnOrders(key).length}
                </span>
              </div>

              <div className="p-2 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {getColumnOrders(key).map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    currentStatus={key}
                    onNext={() => {
                        if(key === 'pending') handleStatusChange(order.id, 'Em Preparo')
                        if(key === 'preparing') handleStatusChange(order.id, 'Saiu para entrega')
                        if(key === 'delivery') handleStatusChange(order.id, 'Concluido')
                    }}
                    onView={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}

function OrderCard({ order, onNext, onView, currentStatus }) {
    const isIfood = order.channel === 'IFOOD'
    const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    const showStatusLabel = currentStatus === 'debug'

    return (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer relative group">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">#{order.display_id || String(order.id).slice(0,4)}</span>
                    {isIfood && <img src="https://cdn.icon-icons.com/icons2/2699/PNG/512/ifood_logo_icon_170304.png" className="w-4 h-4" alt="iFood"/>}
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12}/> {time}
                </span>
            </div>

            {showStatusLabel && (
                <div className="mb-2 text-xs font-mono bg-red-100 text-red-700 px-1 py-0.5 rounded">
                    Status: "{order.status}"
                </div>
            )}

            <div className="text-sm font-medium text-slate-700 truncate mb-2">
                {order.customer_name || 'Cliente Balcão'}
            </div>

            <div className="text-xs text-slate-500 mb-3 line-clamp-2">
                {order.sale_items?.map(i => `${i.quantity}x ${i.product?.name}`).join(', ')}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <span className="font-bold text-green-700">R$ {Number(order.total).toFixed(2)}</span>
                <div className="flex gap-2">
                    <button onClick={onView} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded" title="Ver Detalhes">
                        <Receipt size={16}/>
                    </button>
                    {currentStatus !== 'completed' && currentStatus !== 'debug' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            className="bg-slate-900 text-white p-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs px-2"
                        >
                            <ChevronRight size={14}/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function OrderModal({ order, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <h2 className="font-bold text-lg">Pedido #{order.display_id || order.id}</h2>
                    <button onClick={onClose}><Ban size={20}/></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><MapPin size={16}/> Cliente</h3>
                        <p className="font-bold text-slate-800 text-lg">{order.customer_name}</p>
                    </div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Receipt size={16}/> Itens</h3>
                    <div className="space-y-3 mb-6">
                        {order.sale_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <div className="flex gap-3">
                                    <span className="font-bold text-slate-900 bg-slate-100 px-2 rounded">{item.quantity}x</span>
                                    <span className="text-slate-700">{item.product?.name || 'Item não vinculado'}</span>
                                </div>
                                <span className="font-medium text-slate-600">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                        <span className="text-lg font-bold text-slate-600">Total</span>
                        <span className="text-2xl font-bold text-green-600">R$ {Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">Fechar</button>
                </div>
            </div>
        </div>
    )
}