import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
// ADICIONADO: PlusCircle na lista de imports abaixo
import { Utensils, Loader2, DollarSign, Clock, CheckCircle, ArrowRightLeft, X, Check, Users, CalendarClock, PlusCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PrinterService } from '../services/printer'
import { AuthModal } from '../components/AuthModal'
import { TableDetailModal } from '../components/TableDetailModal' 
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
    } catch (error) { console.error(error) }
  }, [updateTableGrid])

  // 2. Init
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
        } catch (e) { console.error("Erro init:", e) } finally { setLoading(false) }
    }
    initData()
    const channel = supabase.channel('mesas-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchOpenTables()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOpenTables, user])

  // 3. Sync Modal
  useEffect(() => {
    if (selectedTableSale) {
        const updatedSelected = openSales.find(s => s.id === selectedTableSale.id)
        if (!updatedSelected) setSelectedTableSale(null)
        else if (JSON.stringify(updatedSelected) !== JSON.stringify(selectedTableSale)) setSelectedTableSale(updatedSelected)
    }
  }, [openSales, selectedTableSale])

  const handleTableClick = (tableNumber) => {
    const existingSale = openSales.find(s => s.table_number === tableNumber)
    if (existingSale) setSelectedTableSale(existingSale)
    else navigate(`/vendas?mesa=${tableNumber}`)
  }

  // --- AÇÕES ---
  const toggleReservation = async (e, tableNumber, existingSale) => {
    e.stopPropagation() 
    if (!currentCompanyId) return toast.error("Erro: Empresa não identificada.")
    if (existingSale && existingSale.status !== 'reservada') return toast("Mesa ocupada.", { icon: '🚫' })

    const toastId = toast.loading(existingSale ? "Liberando mesa..." : "Reservando mesa...")
    try {
        const { error } = await supabase.rpc('toggle_reservation_rpc', {
            p_company_id: currentCompanyId,
            p_table_number: parseInt(tableNumber)
        })
        if (error) throw error
        toast.success(existingSale ? "Mesa liberada!" : "Mesa reservada!", { id: toastId })
        fetchOpenTables()
    } catch (err) { console.error(err); toast.error("Erro ao alterar reserva.", { id: toastId }) }
  }

  const handleStartService = async () => {
      if (!selectedTableSale) return
      if (selectedTableSale.status === 'reservada') {
          const toastId = toast.loading("Iniciando atendimento...")
          try {
              const { error } = await supabase.from('sales').update({ status: 'aberto', customer_name: `Mesa ${selectedTableSale.table_number}`, people_count: 1 }).eq('id', selectedTableSale.id)
              if (error) throw error
              toast.dismiss(toastId)
              navigate(`/vendas?mesa=${selectedTableSale.table_number}&saleId=${selectedTableSale.id}`)
          } catch (e) { console.error(e); toast.error("Erro ao iniciar.", { id: toastId }) }
      } else {
          navigate(`/vendas?mesa=${selectedTableSale.table_number}&saleId=${selectedTableSale.id}`)
      }
  }

  const handleNewTable = () => {
    const tableNum = prompt("Digite o número da nova mesa:")
    if (tableNum && !isNaN(tableNum)) handleTableClick(parseInt(tableNum))
  }

  const handleUpdatePeople = async (newCount) => {
    if (!selectedTableSale || newCount < 0) return
    try {
        await supabase.from('sales').update({ people_count: parseInt(newCount) }).eq('id', selectedTableSale.id)
        toast.success("Nº de pessoas atualizado")
        // Otimista
        setSelectedTableSale(prev => ({ ...prev, people_count: parseInt(newCount) }))
    } catch (error) { console.error(error); toast.error("Erro ao salvar pessoas") }
  }

  const executeProtectedAction = async (approver) => {
      if (!pendingAction) return
      if (pendingAction.type === 'transfer') {
          const { itemsToMove, targetTable } = pendingAction.data
          const toastId = toast.loading(`Transferindo...`)
          try {
            const { error } = await supabase.rpc('transfer_items_rpc', {
                p_source_sale_id: selectedTableSale.id,
                p_target_table: parseInt(targetTable),
                p_item_ids: itemsToMove,
                p_user_name: approver.name
            });
            if (error) throw error;
            toast.success(`Transferência Concluída!`, { id: toastId })
            setIsTransferModalOpen(false)
            setSelectedTableSale(null)
            fetchOpenTables()
          } catch (error) { console.error("Erro RPC:", error); toast.error("Erro ao transferir.", { id: toastId }) }
      }
      setPendingAction(null)
  }

  const handlePrintBill = async (sale) => {
    const toastId = toast.loading("Gerando pré-conta...");
    try {
        let currentCompanyInfo = companyInfo;
        if (!currentCompanyInfo) {
            const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
            if (data) { currentCompanyInfo = data; setCompanyInfo(data); }
        }
        const subtotal = sale.sale_items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        const serviceRate = currentCompanyInfo?.service_fee || 0;
        const serviceValue = serviceRate > 0 ? subtotal * (serviceRate / 100) : 0;
        const discountValue = Number(sale.discount_value) || 0;
        const finalTotal = subtotal + serviceValue - discountValue;

        const saleToPrint = {
            ...sale,
            subtotal_value: subtotal,
            service_fee_value: serviceValue,
            discount_value: discountValue,
            total_value: finalTotal,
            people_count: sale.people_count || 1,
            sale_items: sale.sale_items 
        };
        await PrinterService.printCustomerReceipt(saleToPrint, currentCompanyInfo)
        toast.success("Pré-conta enviada!", { id: toastId })
    } catch (error) { console.error(error); toast.error("Erro na impressão", { id: toastId }) }
  }

  const getDuration = (startDate) => {
    const diffMins = Math.floor((new Date() - new Date(startDate)) / 60000)
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`
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
                    ? 'bg-amber-50 border-amber-300 text-amber-700' 
                    : isOccupied 
                        ? (isReady ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700')
                        : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300 hover:text-blue-500' 
                }`}
            >
              <div 
                onClick={(e) => toggleReservation(e, num, sale)}
                className={`absolute top-2 right-2 p-1.5 rounded-lg z-10 transition-colors 
                    ${isReserved ? 'bg-amber-200 text-amber-800 hover:bg-amber-300' 
                    : isOccupied ? 'opacity-0 pointer-events-none' 
                    : 'bg-slate-50 text-slate-300 hover:bg-blue-100 hover:text-blue-600'}`}
              >
                <CalendarClock size={18} />
              </div>

              <span className={`text-2xl font-bold mb-2 ${isOccupied ? 'text-slate-800' : isReserved ? 'text-amber-800' : 'text-slate-300'}`}>{num}</span>
              
              {isReserved ? <span className="text-xs font-bold uppercase tracking-widest bg-amber-200/50 px-2 py-1 rounded">Reservada</span> 
                : isReady ? <CheckCircle size={28} /> 
                : <Utensils size={isOccupied ? 28 : 32} className={isOccupied ? 'opacity-80' : 'opacity-20'} />}

              {isOccupied && (
                <div className="mt-3 text-center w-full px-2">
                  <div className="bg-white/80 rounded-lg py-1 px-2 mb-1 flex items-center justify-center gap-1 text-sm font-bold text-slate-800 shadow-sm">
                    <DollarSign size={12}/> {sale.total.toFixed(2)}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-medium opacity-70">
                    <Clock size={10} /> {getDuration(sale.created_at)}
                  </div>
                  {sale.people_count > 1 && (
                      <div className="absolute top-2 left-2 flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-white/50 px-1.5 rounded-full"><Users size={10}/> {sale.people_count}</div>
                  )}
                </div>
              )}
              
              {!isOccupied && !isReserved && <span className="absolute bottom-4 text-xs font-medium uppercase tracking-wider opacity-60">Livre</span>}
            </button>
          )
        })}
      </div>

      {selectedTableSale && !isTransferModalOpen && (
        <TableDetailModal
            sale={selectedTableSale}
            companyInfo={companyInfo}
            onClose={() => setSelectedTableSale(null)}
            onUpdatePeople={handleUpdatePeople}
            onAddItems={handleStartService}
            onPrintBill={() => handlePrintBill(selectedTableSale)}
            onTransfer={() => setIsTransferModalOpen(true)}
            onPay={() => navigate(`/vendas?mesa=${selectedTableSale.table_number}&saleId=${selectedTableSale.id}`)}
        />
      )}

      {isTransferModalOpen && selectedTableSale && (
        <TransferModal sourceSale={selectedTableSale} onClose={() => setIsTransferModalOpen(false)} onConfirm={(data) => { setPendingAction({ type: 'transfer', data }); setAuthModalOpen(true); }} tables={displayTables} />
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
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
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
                    <button disabled={!targetTable || selectedItems.length === 0} onClick={() => onConfirm({ itemsToMove: selectedItems, targetTable })} className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-amber-200">Confirmar Transferência</button>
                </div>
            </div>
        </div>
    )
}