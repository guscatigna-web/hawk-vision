import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Utensils, Loader2, DollarSign, Clock, CheckCircle, Plus, Printer, ArrowRightLeft, X, ArrowRight, Check, Users, PlusCircle, CalendarClock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PrinterService } from '../services/printer'
import { AuthModal } from '../components/AuthModal'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function Mesas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [openSales, setOpenSales] = useState([])
  
  // Estados para Modais
  const [selectedTableSale, setSelectedTableSale] = useState(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  
  // Estados para Auth e Config
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) 
  const [companyInfo, setCompanyInfo] = useState(null) 
  const [currentCompanyId, setCurrentCompanyId] = useState(null) 

  // --- LÓGICA DE MESAS DINÂMICAS ---
  const [displayTables, setDisplayTables] = useState([])

  const updateTableGrid = useCallback((salesData) => {
    const defaultTables = Array.from({ length: 15 }, (_, i) => i + 1)
    const activeTableNumbers = salesData.map(s => s.table_number).filter(Boolean)
    
    // Une as padrão com as ativas
    const allTables = [...new Set([...defaultTables, ...activeTableNumbers])].sort((a, b) => a - b)
    setDisplayTables(allTables)
  }, [])

  // 1. Busca Vendas Abertas
  const fetchOpenTables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*, product:products(name))')
        .not('status', 'in', '("concluido","cancelado","transferido")') 
        .not('table_number', 'is', null)
      
      if (error) throw error
      
      setOpenSales(data || [])
      updateTableGrid(data || [])
      
    } catch (error) {
      console.error(error)
    }
  }, [updateTableGrid])

  // 2. Busca Dados Iniciais
  useEffect(() => {
    async function initData() {
        setLoading(true)
        try {
            if (user?.id) {
                const userIdStr = String(user.id)
                const isNumericId = /^\d+$/.test(userIdStr)
                const searchCol = isNumericId ? 'id' : 'auth_user_id'
                
                const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, userIdStr).maybeSingle()
                if (emp) setCurrentCompanyId(emp.company_id)
            }

            const { data: config } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
            if (config) setCompanyInfo(config)

            await fetchOpenTables()
        } catch (e) {
            console.error("Erro init:", e)
        } finally {
            setLoading(false)
        }
    }
    initData()

    const channel = supabase
      .channel('mesas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchOpenTables()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOpenTables, user])

  // 3. Sincronização do Modal
  useEffect(() => {
    if (selectedTableSale) {
        const updatedSelected = openSales.find(s => s.id === selectedTableSale.id)
        if (!updatedSelected) {
            setSelectedTableSale(null)
        } else if (JSON.stringify(updatedSelected) !== JSON.stringify(selectedTableSale)) {
            setSelectedTableSale(updatedSelected)
        }
    }
  }, [openSales, selectedTableSale])

  const handleTableClick = (tableNumber) => {
    const existingSale = openSales.find(s => s.table_number === tableNumber)
    if (existingSale) {
      setSelectedTableSale(existingSale)
    } else {
      navigate(`/vendas?mesa=${tableNumber}`)
    }
  }

  // --- RESERVAR MESA (CORRIGIDO: TRATAMENTO DE ERRO) ---
  const toggleReservation = async (e, tableNumber, existingSale) => {
    e.stopPropagation() 
    
    if (!currentCompanyId) return toast.error("Erro: Empresa não identificada.")

    // 1. Se já existe venda/reserva
    if (existingSale) {
        if (existingSale.status === 'reservada') {
            try {
                await supabase.from('sales').update({ status: 'cancelado', notes: 'Reserva cancelada' }).eq('id', existingSale.id)
                toast.success(`Mesa ${tableNumber} liberada!`)
                fetchOpenTables()
            } catch (err) { 
                console.error(err) // <--- CORREÇÃO AQUI (Uso do err)
                toast.error("Erro ao liberar mesa.") 
            }
        } else {
            toast("Mesa ocupada não pode ser reservada.", { icon: '🚫' })
        }
        return
    }

    // 2. Se a mesa está livre -> Cria Reserva
    try {
        const { data: session } = await supabase.from('cashier_sessions').select('id').eq('status', 'open').limit(1).maybeSingle()
        
        await supabase.from('sales').insert({
            company_id: currentCompanyId,
            table_number: tableNumber,
            customer_name: 'RESERVA',
            status: 'reservada',
            total: 0,
            people_count: 0,
            cashier_session_id: session?.id || null
        })
        toast.success(`Mesa ${tableNumber} Reservada!`, { icon: '📅' })
        fetchOpenTables()
    } catch (err) {
        console.error(err)
        toast.error("Erro ao reservar.")
    }
  }

  // --- NOVA MESA MANUAL ---
  const handleNewTable = () => {
    const tableNum = prompt("Digite o número da nova mesa:")
    if (tableNum && !isNaN(tableNum)) {
        handleTableClick(parseInt(tableNum))
    }
  }

  // --- ATUALIZAR PESSOAS (PAX) ---
  const handleUpdatePeople = async (newCount) => {
    if (!selectedTableSale || newCount < 0) return
    try {
        await supabase.from('sales').update({ people_count: parseInt(newCount) }).eq('id', selectedTableSale.id)
        toast.success("Nº de pessoas atualizado")
        setSelectedTableSale(prev => ({ ...prev, people_count: parseInt(newCount) }))
    } catch (error) {
        console.error(error)
        toast.error("Erro ao salvar pessoas")
    }
  }

  const executeProtectedAction = async (approver) => {
      if (!pendingAction) return

      if (pendingAction.type === 'transfer') {
          const { itemsToMove, targetTable } = pendingAction.data
          const sourceSaleId = selectedTableSale.id
          const toastId = toast.loading(`Transferindo via Sistema...`)

          try {
            const { error } = await supabase.rpc('transfer_items_rpc', {
                p_source_sale_id: sourceSaleId,
                p_target_table: parseInt(targetTable),
                p_item_ids: itemsToMove,
                p_user_name: approver.name
            });

            if (error) throw error;

            toast.success(`Transferência Concluída!`, { id: toastId })
            setIsTransferModalOpen(false)
            setSelectedTableSale(null)
            fetchOpenTables()

          } catch (error) {
            console.error("Erro RPC Transfer:", error)
            toast.error("Erro ao processar transferência.", { id: toastId })
          }
      }
      setPendingAction(null)
  }

  const handlePrintBill = async (sale) => {
    const toastId = toast.loading("Gerando pré-conta...");
    try {
        const subtotal = sale.sale_items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        const serviceRate = companyInfo?.service_fee || 0;
        const serviceValue = serviceRate > 0 ? subtotal * (serviceRate / 100) : 0;
        const discountValue = Number(sale.discount_value) || 0;
        const finalTotal = subtotal + serviceValue - discountValue;

        const saleToPrint = {
            ...sale,
            total: finalTotal,
            sale_items: [
                ...sale.sale_items,
                ...(serviceValue > 0 ? [{ quantity: 1, unit_price: serviceValue, product: { name: `Taxa de Serviço (${serviceRate}%)` } }] : []),
                ...(discountValue > 0 ? [{ quantity: 1, unit_price: -discountValue, product: { name: `Desconto` } }] : [])
            ]
        };

        await PrinterService.printCustomerReceipt(saleToPrint, companyInfo)
        toast.success("Pré-conta enviada!", { id: toastId })
    } catch (error) {
        console.error(error)
        toast.error("Erro na impressão", { id: toastId })
    }
  }

  const openTransfer = () => setIsTransferModalOpen(true)
  const handleTransferRequest = (transferData) => {
    setPendingAction({ type: 'transfer', data: transferData })
    setAuthModalOpen(true)
  }

  const getDuration = (startDate) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffMs = now - start
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Mesas</h2>
            <p className="text-sm text-slate-500">Acompanhamento em tempo real.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={handleNewTable} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                <PlusCircle size={20}/> Abrir Mesa
            </button>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm font-bold text-slate-600 flex items-center">
                {openSales.filter(s => s.status !== 'reservada').length} Abertas
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {displayTables.map(num => {
          const sale = openSales.find(s => s.table_number === num)
          const isReserved = sale?.status === 'reservada'
          const isOccupied = !!sale && !isReserved
          const isReady = sale?.status === 'pronto'

          return (
            <button
              key={num}
              onClick={() => handleTableClick(num)}
              className={`relative h-40 rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 
                ${isReserved 
                    ? 'bg-amber-50 border-amber-300 text-amber-700' // Estilo Reservada
                    : isOccupied 
                        ? (isReady ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700')
                        : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300 hover:text-blue-500' // Estilo Livre
                }`}
            >
              {/* BOTÃO RESERVA / LIBERAÇÃO (Canto Superior Direito) */}
              <div 
                onClick={(e) => toggleReservation(e, num, sale)}
                className={`absolute top-2 right-2 p-1.5 rounded-lg z-10 transition-colors 
                    ${isReserved 
                        ? 'bg-amber-200 text-amber-800 hover:bg-amber-300' // Botão para liberar
                        : isOccupied 
                            ? 'opacity-0 pointer-events-none' // Oculto se ocupado
                            : 'bg-slate-50 text-slate-300 hover:bg-blue-100 hover:text-blue-600' // Botão para reservar
                    }`}
                title={isReserved ? "Liberar Reserva" : "Reservar Mesa"}
              >
                <CalendarClock size={18} />
              </div>

              <span className={`text-2xl font-bold mb-2 ${isOccupied ? 'text-slate-800' : isReserved ? 'text-amber-800' : 'text-slate-300'}`}>
                {num}
              </span>
              
              {isReserved ? (
                  <span className="text-xs font-bold uppercase tracking-widest bg-amber-200/50 px-2 py-1 rounded">Reservada</span>
              ) : isReady ? (
                  <CheckCircle size={28} /> 
              ) : (
                  <Utensils size={isOccupied ? 28 : 32} className={isOccupied ? 'opacity-80' : 'opacity-20'} />
              )}

              {isOccupied && (
                <div className="mt-3 text-center w-full px-2">
                  <div className="bg-white/80 rounded-lg py-1 px-2 mb-1 flex items-center justify-center gap-1 text-sm font-bold text-slate-800 shadow-sm">
                    <DollarSign size={12}/> {sale.total.toFixed(2)}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-medium opacity-70">
                    <Clock size={10} /> {getDuration(sale.created_at)}
                  </div>
                  {sale.people_count > 1 && (
                      <div className="absolute top-2 left-2 flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-white/50 px-1.5 rounded-full">
                          <Users size={10}/> {sale.people_count}
                      </div>
                  )}
                </div>
              )}
              
              {!isOccupied && !isReserved && (
                <span className="absolute bottom-4 text-xs font-medium uppercase tracking-wider opacity-60">Livre</span>
              )}
            </button>
          )
        })}
      </div>

      {/* MODAL DETALHES */}
      {selectedTableSale && !isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            Mesa {selectedTableSale.table_number}
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-normal">#{selectedTableSale.id}</span>
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {selectedTableSale.status === 'reservada' ? 'MESA RESERVADA' : `Aberta às ${new Date(selectedTableSale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </p>
                    </div>
                    <button onClick={() => setSelectedTableSale(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    
                    {/* CONTROLE DE PESSOAS */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Users size={20} />
                            <span className="font-bold text-sm">Quantidade de Pessoas:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleUpdatePeople((selectedTableSale.people_count || 0) - 1)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">-</button>
                            <span className="w-8 text-center font-bold text-lg">{selectedTableSale.people_count || 0}</span>
                            <button onClick={() => handleUpdatePeople((selectedTableSale.people_count || 0) + 1)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">+</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {selectedTableSale.sale_items?.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 italic">
                                {selectedTableSale.status === 'reservada' ? 'Aguardando chegada do cliente.' : 'Nenhum item lançado.'}
                            </div>
                        ) : (
                            selectedTableSale.sale_items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded text-xs">{item.quantity}x</span>
                                        <span className="text-slate-700 font-medium">{item.product?.name || 'Item'}</span>
                                    </div>
                                    <span className="text-slate-600">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 px-2">
                        <span className="text-slate-500 font-medium">Subtotal</span>
                        <span className="text-xl font-bold text-slate-800">R$ {selectedTableSale.total.toFixed(2)}</span>
                    </div>
                    {companyInfo?.service_fee > 0 && selectedTableSale.total > 0 && (
                        <div className="flex justify-between items-center px-2 text-sm text-blue-600">
                            <span>+ Serviço ({companyInfo.service_fee}%)</span>
                            <span className="font-bold">
                                R$ {(selectedTableSale.total * (companyInfo.service_fee / 100)).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-2 gap-3">
                    <button onClick={() => navigate(`/vendas?mesa=${selectedTableSale.table_number}&saleId=${selectedTableSale.id}`)} className="col-span-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                        <Plus size={20}/> {selectedTableSale.status === 'reservada' ? 'Iniciar Atendimento' : 'Adicionar Itens'}
                    </button>
                    
                    <button onClick={() => handlePrintBill(selectedTableSale)} disabled={selectedTableSale.total <= 0} className="py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        <Printer size={18}/> Parcial
                    </button>
                    
                    <button onClick={openTransfer} disabled={selectedTableSale.status === 'reservada'} className="py-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        <ArrowRightLeft size={18}/> Transferir
                    </button>

                    <button onClick={() => navigate(`/vendas?mesa=${selectedTableSale.table_number}&saleId=${selectedTableSale.id}`)} disabled={selectedTableSale.total <= 0} className="col-span-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform disabled:opacity-50">
                        <DollarSign size={20}/> Fechar Conta (Caixa)
                    </button>
                </div>
            </div>
        </div>
      )}

      {isTransferModalOpen && selectedTableSale && (
        <TransferModal sourceSale={selectedTableSale} onClose={() => setIsTransferModalOpen(false)} onConfirm={handleTransferRequest} tables={displayTables} />
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => { setAuthModalOpen(false); setPendingAction(null) }} onSuccess={executeProtectedAction} title="Autorizar Ação" message="Esta ação exige senha de gerente." />
    </div>
  )
}

function TransferModal({ sourceSale, onClose, onConfirm, tables }) {
    const [targetTable, setTargetTable] = useState('')
    const [selectedItems, setSelectedItems] = useState([])

    const toggleItem = (itemId) => {
        if (selectedItems.includes(itemId)) setSelectedItems(selectedItems.filter(id => id !== itemId))
        else setSelectedItems([...selectedItems, itemId])
    }

    const selectAll = () => {
        if (selectedItems.length === sourceSale.sale_items.length) setSelectedItems([])
        else setSelectedItems(sourceSale.sale_items.map(i => i.id))
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ArrowRightLeft className="text-amber-600"/> Transferir Itens</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Para qual mesa?</label>
                        <select className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-amber-500" value={targetTable} onChange={e => setTargetTable(e.target.value)}>
                            <option value="">Selecione...</option>
                            {tables.map(t => t !== sourceSale.table_number && <option key={t} value={t}>Mesa {t}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Selecione os itens</label>
                            <button onClick={selectAll} className="text-xs text-blue-600 font-bold hover:underline">{selectedItems.length === sourceSale.sale_items.length ? 'Desmarcar Todos' : 'Marcar Todos'}</button>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                            {sourceSale.sale_items.map(item => (
                                <div key={item.id} onClick={() => toggleItem(item.id)} className={`flex justify-between items-center p-3 border-b border-slate-100 cursor-pointer transition-colors ${selectedItems.includes(item.id) ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedItems.includes(item.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>{selectedItems.includes(item.id) && <Check size={14}/>}</div>
                                        <span className="text-sm font-medium text-slate-700">{item.quantity}x {item.product?.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button disabled={!targetTable || selectedItems.length === 0} onClick={() => onConfirm({ itemsToMove: selectedItems, targetTable })} className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-amber-200">Confirmar Transferência <ArrowRight size={16}/></button>
                </div>
            </div>
        </div>
    )
}