import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Bike, Ban, MapPin, Receipt, ChevronRight, Volume2, AlertTriangle, Printer, ToggleLeft, ToggleRight, Settings, XCircle, AlertCircle, Monitor, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { KitchenTicket } from '../components/KitchenTicket'
import { PrinterService } from '../services/printer'

// Motivos padrão exigidos pela API do iFood
const CANCELLATION_REASONS = [
    { code: '501', label: 'Problemas de sistema/equipamento' },
    { code: '502', label: 'Produto indisponível' },
    { code: '503', label: 'Restaurante sem entregador' },
    { code: '506', label: 'Pedido fora da área de entrega' },
    { code: '509', label: 'Restaurante fechado' },
    { code: '511', label: 'Área de risco' },
    { code: '512', label: 'Dados do cliente incompletos' },
    { code: '513', label: 'Cliente não localizado' }
]

export default function Pedidos() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderToCancel, setOrderToCancel] = useState(null)
  
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [cashierStatus, setCashierStatus] = useState('checking')
  const [errorMsg, setErrorMsg] = useState(null)
  
  // Estado para indicar se o polling está rodando
  const [isPolling, setIsPolling] = useState(false)
  
  const [autoAcceptInfo, setAutoAcceptInfo] = useState({ enabled: false, loading: true })
  
  // --- Estado KDS Sincronizado ---
  const [useKDS, setUseKDS] = useState(() => localStorage.getItem('hawk_use_kds') === 'true')

  // Estado para guardar dados da empresa (Para impressão)
  const [companyInfo, setCompanyInfo] = useState(null)

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

  // Effect para Sincronizar KDS/Impressora entre abas
  useEffect(() => {
    const handleStorageChange = () => {
        setUseKDS(localStorage.getItem('hawk_use_kds') === 'true')
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('hawk_kds_change', handleStorageChange)
    return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('hawk_kds_change', handleStorageChange)
    }
  }, [])

  const toggleKDSMode = () => {
    const newValue = !useKDS
    setUseKDS(newValue)
    localStorage.setItem('hawk_use_kds', newValue)
    window.dispatchEvent(new Event('hawk_kds_change'))
    toast(newValue ? "Modo KDS Ativado" : "Modo Impressora Ativado")
  }

  // Effect para Impressão Fallback (Navegador)
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

  const fetchCompanyInfo = useCallback(async (companyId) => {
      try {
          const { data } = await supabase.from('company_settings').select('*').eq('company_id', companyId).maybeSingle();
          if (data) setCompanyInfo(data);
      } catch (e) { console.error("Erro company settings:", e); }
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

      if (!settingsFetched.current) { 
          fetchIfoodSettings(companyId); 
          fetchCompanyInfo(companyId);
          settingsFetched.current = true; 
      }

      const { data: session } = await supabase.from('cashier_sessions').select('id').eq('company_id', companyId).eq('status', 'open').maybeSingle();
      if (!session) setCashierStatus('closed'); else setCashierStatus('open');

      const windowDate = new Date();
      windowDate.setDate(windowDate.getDate() - 2);
      
      const { data, error } = await supabase
        .from('sales')
        .select(`*, sale_items (id, quantity, unit_price, product_name, product:products(name, category_id, destination))`)
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
  }, [user, fetchIfoodSettings, fetchCompanyInfo, getSearchColumn]); 

  // --- LOOP DE POLLING (ESSENCIAL PARA RECEBER PEDIDOS) ---
  useEffect(() => {
    let intervalId;

    const runPolling = async () => {
        if (!user) return;
        
        try {
            const searchCol = getSearchColumn(user.id);
            const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, user.id).maybeSingle();
            const companyId = emp?.company_id || user.user_metadata?.company_id || (String(user.id) === '10' ? 1 : null);

            if (companyId) {
                setIsPolling(true);
                // Chama a Edge Function para buscar pedidos no iFood e salvar no banco
                await supabase.functions.invoke('ifood-proxy', {
                    body: { action: 'polling', companyId: companyId }
                });
                // Atualiza a tela localmente
                await fetchOrders();
            }
        } catch (error) {
            console.error("Erro no ciclo de polling:", error);
        } finally {
            setIsPolling(false);
        }
    };

    // Roda imediatamente ao carregar
    runPolling();

    // Repete a cada 45 segundos
    intervalId = setInterval(runPolling, 45000);

    return () => clearInterval(intervalId);
  }, [user, getSearchColumn, fetchOrders]);


  const handlePrint = useCallback(async (order) => {
    const toastId = toast.loading(useKDS ? "Enviando para KDS..." : "Imprimindo Produção...");
    
    const isIfood = order.channel === 'IFOOD';
    const hasUnmappedItems = order.sale_items.some(i => !i.product);
    const allItems = order.sale_items;

    if (isIfood) {
        try {
            await PrinterService.printExpeditionTicket(order);
        } catch (e) {
            console.error("Erro ao imprimir expedição:", e);
        }
    }

    if (useKDS) {
        try {
            const itemIds = order.sale_items.map(i => i.id);
            if (itemIds.length > 0) {
                await supabase.from('sale_items').update({ status: 'pending' }).in('id', itemIds);
            }
            toast.success("Enviado para telas KDS!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Erro ao enviar para KDS", { id: toastId });
        }
        return; 
    }

    const kitchenItems = [];
    const barItems = [];
    
    if (hasUnmappedItems && isIfood) {
        try {
            await PrinterService.printSectorTicket(order, allItems, "COZINHA (COMPLETO)");
            await PrinterService.printSectorTicket(order, allItems, "BAR (COMPLETO)");
            toast.success("Produção Impressa (Completa)", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Erro QZ Tray.", { id: toastId });
            setPrintData(order); 
            setPrintTrigger(p => p + 1);
        }
        return;
    }

    order.sale_items.forEach(item => {
        const dest = item.product?.destination?.toLowerCase() || '';
        const name = (item.product?.name || item.product_name || '').toLowerCase();
        
        if (dest === 'bar' || dest === 'copa') {
            barItems.push(item);
        } else if (dest === 'cozinha') {
            kitchenItems.push(item);
        } else {
            if (name.includes('cerveja') || name.includes('refrigerante') || name.includes('suco') || name.includes('drink') || name.includes('lata')) {
                barItems.push(item);
            } else {
                kitchenItems.push(item);
            }
        }
    });

    try {
        if (kitchenItems.length > 0) await PrinterService.printSectorTicket(order, kitchenItems, "COZINHA");
        if (barItems.length > 0) await PrinterService.printSectorTicket(order, barItems, "BAR / COPA");
        
        toast.success("Produção Impressa (Separada)", { id: toastId });
        
        if (audioEnabled) {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
            audio.play().catch(() => {});
        }
    } catch (error) {
        console.error("Erro QZ Tray:", error);
        toast.error("QZ Offline. Usando Janela.", { id: toastId });
        
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
    }
  }, [useKDS, audioEnabled]);

  const handlePrintReceipt = useCallback(async (order) => {
      const toastId = toast.loading("Imprimindo recibo...");
      try {
          await PrinterService.printCustomerReceipt(order, companyInfo);
          toast.success("Recibo impresso!", { id: toastId });
      } catch (error) {
          console.error("Erro Recibo:", error);
          toast.error("Erro QZ. Verifique conexão.", { id: toastId });
      }
  }, [companyInfo]);

  const handleStatusChange = useCallback(async (order, newStatus, cancelDetails = null) => {
    if (processingIdRef.current === order.id) return;
    setProcessingId(order.id);
    processingIdRef.current = order.id;
    const toastId = toast.loading(`Processando: ${newStatus}...`);

    try {
        const searchCol = getSearchColumn(user.id);
        const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, user.id).single();
        const currentCompanyId = emp?.company_id || user.user_metadata?.company_id || (String(user.id) === '10' ? 1 : null);

        if (order.channel === 'IFOOD' && order.ifood_order_id) {
            const { error } = await supabase.functions.invoke('ifood-proxy', {
                body: { 
                    action: 'update-status', 
                    companyId: currentCompanyId, 
                    ifoodOrderId: order.ifood_order_id, 
                    status: newStatus,
                    reason: cancelDetails 
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
        }
        
        fetchOrders(); 
    } catch (error) {
        console.error(error);
        toast.error('Erro ao atualizar', { id: toastId });
    } finally {
        setProcessingId(null);
        processingIdRef.current = null;
        setOrderToCancel(null); 
    }
  }, [user, getSearchColumn, handlePrint, fetchOrders]); 

  // --- AUTO-ACEITE (Processa o que chegou do Polling) ---
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

            // Só roda se a config já carregou e é true
            if (isIfood && (status === 'PENDING' || status === 'PLACED') && autoAcceptInfo.enabled && !autoAcceptInfo.loading) {
                console.log(`🤖 AUTO-ACEITE: Pedido #${order.id}. Confirmando...`);
                handleStatusChange(order, 'Em Preparo');
            }
            // Notificações para pedidos já aceitos externamente
            else if (status === 'EM PREPARO' || status === 'CONFIRMED') {
                 handlePrint(order);
                 if (audioEnabled) {
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
                    audio.play().catch(e => console.error(e));
                }
            }
        }
    });
  }, [orders, loading, audioEnabled, autoAcceptInfo, handleStatusChange, handlePrint]);

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
      {printData && (
        <div className="hidden">
             <KitchenTicket tickets={printData.tickets} orderInfo={printData.orderInfo} date={printData.date} />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Gerenciador de Pedidos</h1>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Caixa Aberto</span>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleKDSMode} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${useKDS ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-300'}`}
                title="Alternar entre envio para Tela (KDS) ou Impressão Física"
            >
                {useKDS ? <Monitor size={14}/> : <Printer size={14}/>} {useKDS ? 'KDS Ativo' : 'Impressão Ativa'}
            </button>

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

            <div className="flex gap-2 items-center">
                {!audioEnabled && <button onClick={enableAudio} className="bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><Volume2 size={16}/> Ativar Som</button>}
                
                {/* INDICADOR DE STATUS DO POLLING */}
                <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 border transition-all ${isPolling ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    <Bike size={16}/> 
                    {isPolling ? <RefreshCw size={14} className="animate-spin"/> : 'iFood Online'}
                </div>
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
                      onReceipt={() => handlePrintReceipt(order)}
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
      
      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onInitCancellation={() => { setOrderToCancel(selectedOrder); setSelectedOrder(null); }} />}
      {orderToCancel && <CancellationModal onClose={() => setOrderToCancel(null)} onConfirm={(reason) => handleStatusChange(orderToCancel, 'Cancelado', reason)} />}
    </div>
  )
}

function OrderCard({ order, onNext, onView, onPrint, onReceipt, currentStatus, isProcessing }) {
    const isIfood = order.channel === 'IFOOD'
    const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
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
            {order.sale_items?.some(i => !i.product && !i.product_name) && <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded mb-2 w-fit"><AlertTriangle size={10} /> Item s/ vínculo</div>}
            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <span className="font-bold text-green-700">R$ {Number(order.total).toFixed(2)}</span>
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onReceipt(); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded" title="Imprimir Recibo"><Receipt size={16}/></button>
                    <button onClick={onView} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><Receipt size={16}/></button>
                    {currentStatus !== 'completed' && currentStatus !== 'debug' && (
                        <button disabled={isProcessing} onClick={(e) => { e.stopPropagation(); onNext(); }} className="bg-slate-900 text-white p-1.5 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs px-2 disabled:bg-slate-400">{isProcessing ? '...' : <ChevronRight size={14}/>}</button>
                    )}
                </div>
            </div>
        </div>
    )
}

function OrderModal({ order, onClose, onInitCancellation }) {
    const displayId = order.display_id || String(order.ifood_order_id || order.id).slice(0,4);
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <h2 className="font-bold text-lg">Pedido #{displayId}</h2>
                    <button onClick={onClose}><XCircle size={20}/></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100"><h3 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><MapPin size={16}/> Cliente</h3><p className="font-bold text-slate-800 text-lg">{order.customer_name}</p></div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Receipt size={16}/> Itens</h3>
                    <div className="space-y-3 mb-6">
                        {order.sale_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <div className="flex gap-3"><span className="font-bold text-slate-900 bg-slate-100 px-2 rounded">{item.quantity}x</span><span className="text-slate-700">{item.product?.name || item.product_name || <span className="text-red-500 italic">Produto ERP não vinculado</span>}</span></div>
                                <span className="font-medium text-slate-600">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100"><span className="text-lg font-bold text-slate-600">Total</span><span className="text-2xl font-bold text-green-600">R$ {Number(order.total).toFixed(2)}</span></div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    {order.channel === 'IFOOD' ? <button onClick={onInitCancellation} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 flex items-center gap-2"><Ban size={16}/> Cancelar Pedido</button> : <div></div>}
                    <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">Fechar</button>
                </div>
            </div>
        </div>
    )
}

function CancellationModal({ onClose, onConfirm }) {
    const [reason, setReason] = useState(CANCELLATION_REASONS[0].code)
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-red-200">
                <div className="bg-red-50 p-4 border-b border-red-100">
                    <h3 className="font-bold text-red-700 flex items-center gap-2"><AlertCircle size={20}/> Cancelar Pedido iFood</h3>
                    <p className="text-red-600 text-xs mt-1">Essa ação é irreversível e será enviada ao iFood.</p>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o motivo:</label>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white mb-4 text-sm">
                        {CANCELLATION_REASONS.map(r => <option key={r.code} value={r.code}>{r.code} - {r.label}</option>)}
                    </select>
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">Ao confirmar, o cliente será notificado e o reembolso processado.</p>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Voltar</button>
                    <button onClick={() => { const selected = CANCELLATION_REASONS.find(r => r.code === reason); onConfirm({ code: reason, description: selected.label }); }} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Confirmar Cancelamento</button>
                </div>
            </div>
        </div>
    )
}