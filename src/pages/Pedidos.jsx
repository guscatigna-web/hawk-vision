import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Bike, Ban, MapPin, Receipt, ChevronRight, Volume2, AlertCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function Pedidos() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [cashierStatus, setCashierStatus] = useState('checking')
  const [errorMsg, setErrorMsg] = useState(null)
  
  const { user } = useAuth()
  const [processingId, setProcessingId] = useState(null)

  const columns = {
    pending: { label: '🔔 Pendentes', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    preparing: { label: '👨‍🍳 Em Preparo', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    delivery: { label: '🛵 Em Entrega', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
    completed: { label: '✅ Concluídos', color: 'bg-green-100 border-green-300 text-green-800' },
    debug: { label: '❓ Status Desconhecido', color: 'bg-gray-100 border-gray-300 text-gray-800' }
  }

  // Função Auxiliar: Descobre qual coluna usar baseado no formato do ID
  const getSearchColumn = (userId) => {
    // Se for UUID (ex: 'e77ed205-...') busca em auth_user_id
    // Se for Número (ex: 10 ou '10') busca em id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    return isUUID ? 'auth_user_id' : 'id';
  }

  const fetchOrders = useCallback(async () => {
    try {
      if (!user) return;
      setErrorMsg(null);

      // 1. Identificar Empresa do Usuário (Busca Dinâmica)
      let companyId = null;

      // Define se busca por 'id' ou 'auth_user_id'
      const searchCol = getSearchColumn(user.id);
      
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('company_id')
        .eq(searchCol, user.id) // <--- CORREÇÃO AQUI
        .maybeSingle();

      if (empError) {
          console.warn(`Erro ao buscar funcionário via ${searchCol}:`, empError.message);
      } else if (emp) {
          companyId = emp.company_id;
      }

      // Fallback: Tenta pegar dos metadados se a query falhar
      if (!companyId && user.user_metadata?.company_id) {
          companyId = user.user_metadata.company_id;
      }

      if (!companyId) {
          setLoading(false);
          setErrorMsg("Empresa não vinculada a este usuário.");
          return;
      }

      // 2. Buscar CAIXA ABERTO
      const { data: session, error: sessionError } = await supabase
        .from('cashier_sessions')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'open')
        .maybeSingle()

      if (sessionError) console.error('Erro session:', sessionError)

      // Se não tem caixa aberto
      if (!session) {
        setOrders([])
        setCashierStatus('closed')
        setLoading(false)
        return
      }

      setCashierStatus('open')

      // 3. Buscar Vendas do Caixa Atual
      const { data, error } = await supabase
        .from('sales')
        .select(`*, sale_items (quantity, unit_price, product:products(name))`)
        .eq('cashier_session_id', session.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])

    } catch (error) {
      console.error('Erro Geral fetchOrders:', error)
      toast.error('Erro ao carregar lista')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchOrders()
    const channel = supabase.channel('sales-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => { 
          fetchOrders() 
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const enableAudio = () => {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    audio.play().then(() => { toast.success("Som Ativado!"); setAudioEnabled(true); }).catch(e => console.error(e));
  }

  async function handleStatusChange(order, newStatus) {
    if (processingId) return; 
    setProcessingId(order.id);
    const toastId = toast.loading("Processando...");

    try {
        // Busca Company ID novamente para garantir segurança
        const searchCol = getSearchColumn(user.id);
        const { data: emp } = await supabase
            .from('employees')
            .select('company_id')
            .eq(searchCol, user.id) // <--- CORREÇÃO AQUI TAMBÉM
            .single();
        
        const currentCompanyId = emp?.company_id || user.user_metadata?.company_id;

        if (!currentCompanyId) throw new Error("Empresa não identificada.");

        // Lógica iFood vs Local
        if (order.channel === 'IFOOD' && order.ifood_order_id) {
            const { error } = await supabase.functions.invoke('ifood-proxy/update-status', {
                body: { 
                    companyId: currentCompanyId,
                    ifoodOrderId: order.ifood_order_id,
                    status: newStatus
                }
            });
            if (error) throw error;
            toast.success(`iFood atualizado: ${newStatus}`, { id: toastId });
        } else {
            const { error } = await supabase.from('sales').update({ status: newStatus }).eq('id', order.id);
            if (error) throw error;
            toast.success(`Movido para: ${newStatus}`, { id: toastId });
        }
        
        fetchOrders(); // Atualiza a tela

    } catch (error) {
        console.error(error);
        toast.error('Erro ao atualizar status', { id: toastId });
    } finally {
        setProcessingId(null);
    }
  }

  const getColumnOrders = (columnKey) => {
    return orders.filter(o => {
      const s = (o.status || '').toLowerCase().trim()
      if (columnKey === 'pending') return ['pendente', 'placed', 'plc', 'pending', 'new'].includes(s)
      if (columnKey === 'preparing') return ['em preparo', 'confirmed', 'cfm', 'preparando', 'preparing'].includes(s)
      if (columnKey === 'delivery') return ['saiu para entrega', 'dispatched', 'dsp', 'entrega', 'delivery', 'ready_to_pickup'].includes(s)
      if (columnKey === 'completed') return ['concluido', 'concluded', 'con', 'entregue', 'completed'].includes(s)
      if (columnKey === 'debug') {
        const allKnown = ['pendente', 'placed', 'plc', 'pending', 'new','em preparo', 'confirmed', 'cfm', 'preparando', 'preparing','saiu para entrega', 'dispatched', 'dsp', 'entrega', 'delivery', 'ready_to_pickup','concluido', 'concluded', 'con', 'entregue', 'completed','cancelado', 'cancelled']
        return !allKnown.includes(s) && !['cancelado', 'cancelled'].includes(s)
      }
      return false
    })
  }

  if (loading) return <div className="p-8 text-center">Carregando painel...</div>

  // Tela de Erro (Se não achar empresa)
  if (errorMsg) {
      return (
          <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-red-500">
              <AlertCircle size={64} className="mb-4" />
              <h2 className="text-xl font-bold">Erro de Configuração</h2>
              <p className="text-sm mt-2">{errorMsg}</p>
              <p className="text-xs text-slate-400 mt-4">ID do Usuário: {user?.id}</p>
          </div>
      )
  }

  // Tela de Caixa Fechado
  if (cashierStatus === 'closed') {
      return (
          <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-slate-400">
              <Ban size={64} className="mb-4 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-600">Caixa Fechado</h2>
              <p className="text-sm">Abra o caixa para visualizar e receber novos pedidos.</p>
          </div>
      )
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Gerenciador de Pedidos</h1>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Caixa Aberto
            </span>
        </div>
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
                <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-black/60 font-mono">{getColumnOrders(key).length}</span>
              </div>
              <div className="p-2 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {getColumnOrders(key).map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    currentStatus={key}
                    isProcessing={processingId === order.id}
                    onNext={() => {
                        if(key === 'pending') handleStatusChange(order, 'Em Preparo')
                        if(key === 'preparing') handleStatusChange(order, 'Saiu para entrega')
                        if(key === 'delivery') handleStatusChange(order, 'Concluido')
                    }}
                    onView={() => setSelectedOrder(order)}
                  />
                ))}
                {getColumnOrders(key).length === 0 && <div className="h-full flex items-center justify-center text-black/20 italic text-sm">Vazio</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  )
}

function OrderCard({ order, onNext, onView, currentStatus, isProcessing }) {
    const isIfood = order.channel === 'IFOOD'
    const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    const showStatusLabel = currentStatus === 'debug'
    return (
        <div className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer relative group ${isProcessing ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">#{order.display_id || String(order.id).slice(0,4)}</span>
                    {isIfood && <img src="https://cdn.icon-icons.com/icons2/2699/PNG/512/ifood_logo_icon_170304.png" className="w-4 h-4" alt="iFood"/>}
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {time}</span>
            </div>
            {showStatusLabel && <div className="mb-2 text-xs font-mono bg-red-100 text-red-700 px-1 py-0.5 rounded">Status: "{order.status}"</div>}
            <div className="text-sm font-medium text-slate-700 truncate mb-2">{order.customer_name || 'Cliente Balcão'}</div>
            <div className="text-xs text-slate-500 mb-3 line-clamp-2">{order.sale_items?.map(i => `${i.quantity}x ${i.product?.name}`).join(', ')}</div>
            {order.sale_items?.some(i => !i.product) && <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded mb-2 w-fit"><AlertTriangle size={10} /> Item s/ vínculo</div>}
            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <span className="font-bold text-green-700">R$ {Number(order.total).toFixed(2)}</span>
                <div className="flex gap-2">
                    <button onClick={onView} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><Receipt size={16}/></button>
                    {currentStatus !== 'completed' && currentStatus !== 'debug' && (
                        <button disabled={isProcessing} onClick={(e) => { e.stopPropagation(); onNext(); }} className="bg-slate-900 text-white p-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs px-2 disabled:bg-slate-400">
                            {isProcessing ? '...' : <ChevronRight size={14}/>}
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
                                    <span className="text-slate-700">{item.product?.name || <span className="text-red-500 italic">Produto ERP não vinculado</span>}</span>
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