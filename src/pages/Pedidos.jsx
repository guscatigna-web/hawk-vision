import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Bike, Ban, MapPin, Receipt, ChevronRight, Volume2, AlertTriangle, Printer, ToggleLeft, ToggleRight, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { KitchenTicket } from '../components/KitchenTicket'

export default function Pedidos() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [cashierStatus, setCashierStatus] = useState('checking')
  const [errorMsg, setErrorMsg] = useState(null)
  
  const [autoAcceptInfo, setAutoAcceptInfo] = useState({ enabled: false, loading: true })
  
  const { user } = useAuth()
  const [processingId, setProcessingId] = useState(null)
  const processingIdRef = useRef(null) 
  
  const [printData, setPrintData] = useState(null)
  const [printTrigger, setPrintTrigger] = useState(0)

  const processedOrderIds = useRef(new Set())
  const isFirstLoad = useRef(true)
  const settingsFetched = useRef(false) 

  const columns = {
    pending: { label: '🔔 Pendentes', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    preparing: { label: '👨‍🍳 Em Preparo', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    delivery: { label: '🛵 Em Entrega', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
    completed: { label: '✅ Concluídos', color: 'bg-green-100 border-green-300 text-green-800' }
  }

  useEffect(() => {
    if (printData && printTrigger > 0) {
        const timer = setTimeout(() => { window.print(); }, 500);
        return () => clearTimeout(timer);
    }
  }, [printTrigger, printData]);

  const getSearchColumn = useCallback((userId) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    return isUUID ? 'auth_user_id' : 'id';
  }, []);

  const fetchIfoodSettings = useCallback(async (companyId) => {
      try {
          const { data } = await supabase.from('integrations_ifood').select('auto_accept').eq('company_id', companyId).maybeSingle();
          if (data) setAutoAcceptInfo({ enabled: data.auto_accept, loading: false });
          else setAutoAcceptInfo({ enabled: false, loading: false });
      } catch (error) { console.error("Erro config iFood:", error); }
  }, []);

  const toggleAutoAccept = async () => {
      if (autoAcceptInfo.loading) return;
      const newState = !autoAcceptInfo.enabled;
      setAutoAcceptInfo(prev => ({ ...prev, enabled: newState }));
      try {
          const searchCol = getSearchColumn(user.id);
          const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, user.id).maybeSingle();
          const companyId = emp?.company_id || user.user_metadata?.company_id || (String(user.id) === '10' ? 1 : null);
          if (companyId) {
              await supabase.from('integrations_ifood').update({ auto_accept: newState }).eq('company_id', companyId);
              toast.success(`Aceite Automático ${newState ? 'ATIVADO' : 'DESATIVADO'}`);
          }
      } catch (e) {
          console.error(e);
          toast.error("Erro ao salvar config");
          setAutoAcceptInfo(prev => ({ ...prev, enabled: !newState }));
      }
  };

  const fetchOrders = useCallback(async () => {
    try {
      if (!user) return;
      setErrorMsg(null);
      let companyId = null;
      const searchCol = getSearchColumn(user.id);
      
      const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, user.id).maybeSingle();
      if (emp) companyId = emp.company_id;
      if (!companyId && user.user_metadata?.company_id) companyId = user.user_metadata.company_id;
      if (!companyId && String(user.id) === '10') companyId = 1;

      if (!companyId) { setLoading(false); setErrorMsg("Empresa não vinculada."); return; }

      if (!settingsFetched.current) { fetchIfoodSettings(companyId); settingsFetched.current = true; }

      const { data: session } = await supabase.from('cashier_sessions').select('id').eq('company_id', companyId).eq('status', 'open').maybeSingle();
      if (!session) setCashierStatus('closed'); else setCashierStatus('open');

      const windowDate = new Date();
      windowDate.setDate(windowDate.getDate() - 2);
      
      const { data, error } = await supabase
        .from('sales')
        .select(`*, sale_items (quantity, unit_price, product:products(name, category_id))`)
        .eq('company_id', companyId)
        .gte('created_at', windowDate.toISOString())
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const cleanOrders = (data || []).filter(order => {
          const channel = (order.channel || '').toUpperCase();
          const ifoodId = order.ifood_order_id || '';
          return channel.includes('IFOOD') || (ifoodId.length > 5);
      });

      setOrders(cleanOrders);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [user, fetchIfoodSettings, getSearchColumn]); 

  const handlePrint = useCallback((order) => {
    const kitchenItems = [];
    const barItems = [];
    order.sale_items.forEach(item => {
        const name = item.product?.name?.toLowerCase() || '';
        if (name.includes('cerveja') || name.includes('refrigerante') || name.includes('suco') || name.includes('drink')) {
            barItems.push(item);
        } else {
            kitchenItems.push(item);
        }
    });

    const tickets = [];
    if (kitchenItems.length > 0) tickets.push({ sector: 'COZINHA', items: kitchenItems });
    if (barItems.length > 0) tickets.push({ sector: 'BAR', items: barItems });

    const displayId = order.display_id || String(order.ifood_order_id || order.id).slice(0,4);

    const orderInfo = {
        type: order.channel === 'IFOOD' ? 'IFOOD' : 'MESA',
        identifier: order.channel === 'IFOOD' ? displayId : 'BALCÃO',
        customer: order.customer_name,
        waiter: 'Sistema'
    };

    setPrintData({ tickets, orderInfo, date: new Date().toLocaleString() });
    setPrintTrigger(prev => prev + 1);
  }, []);

  const handleStatusChange = useCallback(async (order, newStatus) => {
    if (processingIdRef.current === order.id) return;
    setProcessingId(order.id);
    processingIdRef.current = order.id;
    const toastId = toast.loading(`Processando: ${newStatus}...`);

    try {
        const searchCol = getSearchColumn(user.id);
        const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, user.id).single();
        const currentCompanyId = emp?.company_id || user.user_metadata?.company_id || (String(user.id) === '10' ? 1 : null);

        if (order.channel === 'IFOOD' && order.ifood_order_id) {
            const { error } = await supabase.functions.invoke('ifood-proxy/update-status', {
                body: { 
                    companyId: currentCompanyId, 
                    ifoodOrderId: order.ifood_order_id, 
                    status: newStatus 
                }
            });
            if (error) throw error;
            toast.success(`iFood: ${newStatus}`, { id: toastId });
        } 
        
        const { error } = await supabase.from('sales').update({ status: newStatus }).eq('id', order.id);
        if (error) throw error;
        
        if (order.channel !== 'IFOOD') toast.success(`Movido para: ${newStatus}`, { id: toastId });
        
        if (newStatus === 'Em Preparo') {
            handlePrint(order);
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
            audio.play().catch(e => console.error(e));
        }
        
        fetchOrders(); 
    } catch (error) {
        console.error(error);
        toast.error('Erro ao atualizar', { id: toastId });
    } finally {
        setProcessingId(null);
        processingIdRef.current = null;
    }
  }, [user, getSearchColumn, handlePrint, fetchOrders]); 

  // --- O CÉREBRO DO AUTO-ACEITE (ROBOT OPERATOR) ---
  useEffect(() => {
    if (loading || orders.length === 0) return;

    if (isFirstLoad.current) {
        orders.forEach(o => processedOrderIds.current.add(o.id));
        isFirstLoad.current = false;
        return;
    }

    orders.forEach(order => {
        if (!processedOrderIds.current.has(order.id)) {
            processedOrderIds.current.add(order.id);
            
            const isIfood = order.channel === 'IFOOD';
            const status = (order.status || '').toUpperCase();

            if (isIfood && (status === 'PENDING' || status === 'PLACED') && autoAcceptInfo.enabled) {
                console.log(`🤖 AUTO-ACEITE: Detectado pedido #${order.id}. Confirmando...`);
                handleStatusChange(order, 'Em Preparo');
            }
            else if (status === 'EM PREPARO' || status === 'CONFIRMED') {
                 handlePrint(order);
                 if (audioEnabled) {
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
                    audio.play().catch(e => console.error(e));
                }
            }
        }
    });
  }, [orders, loading, audioEnabled, autoAcceptInfo.enabled, handleStatusChange, handlePrint]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('sales-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchOrders()).subscribe();
    return () => { supabase.removeChannel(channel) };
  }, [fetchOrders]);

  const enableAudio = () => {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    audio.play().then(() => { toast.success("Som Ativado!"); setAudioEnabled(true); }).catch(e => console.error(e));
  }

  const getColumnOrders = (key) => orders.filter(o => {
      const s = (o.status || '').toLowerCase().trim();
      if (key === 'pending') return ['pendente', 'placed', 'plc', 'pending', 'new', 'aberto'].includes(s);
      if (key === 'preparing') return ['em preparo', 'confirmed', 'cfm', 'preparando', 'preparing'].includes(s);
      if (key === 'delivery') return ['saiu para entrega', 'dispatched', 'dsp', 'entrega', 'delivery', 'ready_to_pickup'].includes(s);
      if (key === 'completed') return ['concluido', 'concluded', 'con', 'entregue', 'completed'].includes(s);
      return false;
  });

  if (loading) return <div className="p-8 text-center">Carregando painel...</div>
  if (errorMsg) return <div className="h-full flex items-center justify-center text-red-500">{errorMsg}</div>
  if (cashierStatus === 'closed') return <div className="h-full flex flex-col items-center justify-center text-slate-400"><Ban size={64} className="mb-4"/><p>Caixa Fechado</p></div>

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      {printData && <KitchenTicket tickets={printData.tickets} orderInfo={printData.orderInfo} date={printData.date} />}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Gerenciador de Pedidos</h1>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Caixa Aberto</span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1"><Settings size={14}/> Auto-Aceite:</span>
                <button 
                    onClick={toggleAutoAccept} 
                    className={`transition-colors ${autoAcceptInfo.enabled ? 'text-green-600' : 'text-slate-300'}`}
                    disabled={autoAcceptInfo.loading}
                >
                    {autoAcceptInfo.enabled ? <ToggleRight size={32} className="fill-current"/> : <ToggleLeft size={32} className="fill-current"/>}
                </button>
            </div>

            <div className="flex gap-2">
                {!audioEnabled && <button onClick={enableAudio} className="bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><Volume2 size={16}/> Ativar Som</button>}
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><Bike size={16}/> iFood Online</span>
            </div>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full min-w-[1200px]">
          {Object.entries(columns).map(([key, col]) => {
            const ordersInColumn = getColumnOrders(key);

            if (key === 'pending' && ordersInColumn.length === 0) return null;

            return (
              <div key={key} className={`flex-1 flex flex-col rounded-xl border h-full max-h-full ${col.color.split(' ')[0]} ${col.color.replace('text-', 'border-').split(' ')[1]}`}>
                <div className="p-3 border-b border-black/5 font-bold flex justify-between items-center">
                  <span className={col.color.split(' ')[2]}>{col.label}</span>
                  <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-black/60 font-mono">{ordersInColumn.length}</span>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                  {ordersInColumn.map(order => (
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
                      onPrint={() => handlePrint(order)}
                      onView={() => setSelectedOrder(order)}
                    />
                  ))}
                  {ordersInColumn.length === 0 && <div className="h-full flex items-center justify-center text-black/20 italic text-sm">Vazio</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  )
}

function OrderCard({ order, onNext, onView, onPrint, currentStatus, isProcessing }) {
    const isIfood = order.channel === 'IFOOD'
    const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    
    // DisplayID extraído corretamente
    const displayId = order.display_id || String(order.ifood_order_id || order.id).slice(0,4);

    return (
        <div className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer relative group ${isProcessing ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">#{displayId}</span>
                    {isIfood && <Bike size={16} className="text-red-600 fill-current" />}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onPrint(); }} className="text-slate-400 hover:text-slate-700" title="Imprimir Produção"><Printer size={14}/></button>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {time}</span>
                </div>
            </div>
            <div className="text-sm font-medium text-slate-700 truncate mb-2">{order.customer_name || 'Cliente Balcão'}</div>
            
            {order.sale_items?.some(i => !i.product) && <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded mb-2 w-fit"><AlertTriangle size={10} /> Item s/ vínculo</div>}
            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <span className="font-bold text-green-700">R$ {Number(order.total).toFixed(2)}</span>
                <div className="flex gap-2">
                    <button onClick={onView} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><Receipt size={16}/></button>
                    {currentStatus !== 'completed' && currentStatus !== 'debug' && (
                        <button disabled={isProcessing} onClick={(e) => { e.stopPropagation(); onNext(); }} className="bg-slate-900 text-white p-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs px-2 disabled:bg-slate-400">{isProcessing ? '...' : <ChevronRight size={14}/>}</button>
                    )}
                </div>
            </div>
        </div>
    )
}

function OrderModal({ order, onClose }) {
    const displayId = order.display_id || String(order.ifood_order_id || order.id).slice(0,4);
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <h2 className="font-bold text-lg">Pedido #{displayId}</h2>
                    <button onClick={onClose}><Ban size={20}/></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100"><h3 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><MapPin size={16}/> Cliente</h3><p className="font-bold text-slate-800 text-lg">{order.customer_name}</p></div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Receipt size={16}/> Itens</h3>
                    <div className="space-y-3 mb-6">
                        {order.sale_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <div className="flex gap-3"><span className="font-bold text-slate-900 bg-slate-100 px-2 rounded">{item.quantity}x</span><span className="text-slate-700">{item.product?.name || <span className="text-red-500 italic">Produto ERP não vinculado</span>}</span></div>
                                <span className="font-medium text-slate-600">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100"><span className="text-lg font-bold text-slate-600">Total</span><span className="text-2xl font-bold text-green-600">R$ {Number(order.total).toFixed(2)}</span></div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end"><button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">Fechar</button></div>
            </div>
        </div>
    )
}