import { useState, useEffect } from 'react'
import { Lock, Unlock, PlusCircle, MinusCircle, X, History, Trash2, AlertTriangle } from 'lucide-react'
import { useCashier } from '../contexts/CashierContext'
import { supabase } from '../lib/supabase'
import { AuthModal } from './AuthModal' // NOVO IMPORT
import toast from 'react-hot-toast'

export function CashierControl() {
  const { currentSession, openCashier, closeCashier, addTransaction, cancelSale } = useCashier()
  
  const [initialAmount, setInitialAmount] = useState('0.00')
  const [activeModal, setActiveModal] = useState(null)
  
  // Estados para formulários
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [closingAmount, setClosingAmount] = useState('')

  // Estados para Histórico
  const [salesHistory, setSalesHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  // Controle de Auth
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // { type: 'transaction' | 'cancel_sale', data: ... }

  // --- LÓGICA DE ABERTURA ---
  const handleOpen = async (type = 'normal') => {
    const val = type === 'express' ? 0 : (initialAmount ? parseFloat(initialAmount) : 0)
    await openCashier(val, type)
  }

  // --- LÓGICA DE TRANSAÇÃO (Protegida) ---
  const initiateTransaction = () => {
    if (!amount || !desc) return toast.error("Preencha valor e motivo")
    
    // Pede senha para autorizar Sangria/Suprimento
    setPendingAction({ 
        type: 'transaction', 
        data: { type: activeModal, amount, desc } 
    })
    setAuthModalOpen(true)
  }

  // --- LÓGICA DE CANCELAMENTO (Protegida) ---
  const initiateCancelSale = (sale) => {
    const reason = prompt(`Motivo do cancelamento da venda R$ ${sale.total}?`)
    if (!reason) return

    setPendingAction({ 
        type: 'cancel_sale', 
        data: { saleId: sale.id, reason } 
    })
    setAuthModalOpen(true)
  }

  // --- EXECUÇÃO APÓS SENHA ---
  const executeProtectedAction = async (approver) => {
    if (!pendingAction) return

    try {
        if (pendingAction.type === 'transaction') {
            const { type, amount, desc } = pendingAction.data
            // Adiciona quem autorizou na descrição
            const fullDesc = `${desc} (Aut: ${approver.name.split(' ')[0]})`
            await addTransaction(type, amount, fullDesc)
            toast.success("Transação registrada!")
            closeModal()
        }

        if (pendingAction.type === 'cancel_sale') {
            const { saleId, reason } = pendingAction.data
            const fullReason = `${reason} (Aut: ${approver.name.split(' ')[0]})`
            await cancelSale(saleId, fullReason)
            toast.success("Venda cancelada!")
            setRefreshCount(prev => prev + 1)
        }
    } catch (error) {
        console.error(error)
        toast.error("Erro ao processar ação")
    } finally {
        setPendingAction(null)
    }
  }

  // --- LÓGICA DE FECHAMENTO ---
  const handleCloseBox = async () => {
    if (!closingAmount) return
    await closeCashier(closingAmount, desc) 
    closeModal()
  }

  // --- LÓGICA DE HISTÓRICO ---
  useEffect(() => {
    if (activeModal === 'historico' && currentSession) {
      let isMounted = true 
      
      const loadData = async () => {
        setLoadingHistory(true)
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .eq('cashier_session_id', currentSession.id)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (isMounted) {
          if (error) console.error('Erro ao buscar histórico:', error)
          else setSalesHistory(data || [])
          setLoadingHistory(false)
        }
      }
      loadData()
      return () => { isMounted = false }
    }
  }, [activeModal, currentSession, refreshCount])

  const closeModal = () => {
    setActiveModal(null)
    setAmount('')
    setDesc('')
    setClosingAmount('')
  }

  // 1. CENÁRIO: CAIXA FECHADO
  if (!currentSession) {
    return (
      <div className="absolute inset-0 z-[50] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 rounded-xl">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center animate-bounce-in">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Caixa Fechado</h2>
          <p className="text-slate-500 mb-6">O PDV está bloqueado. Informe o fundo de troco para iniciar.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleOpen('normal'); }}>
            <div className="text-left mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fundo de Troco (R$)</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full text-3xl font-bold p-3 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-green-100 focus:border-green-500 text-center text-slate-800"
                placeholder="0.00"
                value={initialAmount}
                onChange={e => setInitialAmount(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-green-200 mb-4">
              Abrir Caixa (Padrão)
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">Ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
            type="button"
            onClick={() => handleOpen('express')}
            className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 rounded-xl font-bold transition-colors border border-blue-200 flex items-center justify-center gap-2 mt-2"
          >
            <Unlock size={18} /> Abertura Expressa
          </button>
        </div>
      </div>
    )
  }

  // 2. CENÁRIO: CAIXA ABERTO
  return (
    <>
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => { setAuthModalOpen(false); setPendingAction(null) }} 
        onSuccess={executeProtectedAction} 
        title="Gerente Necessário"
        message="Esta operação de caixa exige autorização."
      />

      {/* BARRA INFERIOR FIXA */}
      <div className="fixed bottom-0 left-0 sm:left-64 right-0 bg-slate-900 text-white p-2 shadow-2xl border-t border-slate-800 z-40 flex justify-between items-center gap-2 px-4 print:hidden">
        
        <div className="flex gap-1 items-center">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${currentSession.type === 'express' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${currentSession.type === 'express' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                {currentSession.type === 'express' ? 'CAIXA EXPRESSO' : 'CAIXA ABERTO'}
            </div>
        </div>

        <div className="flex gap-4">
            <ActionButton icon={<PlusCircle size={20}/>} label="Suprimento" onClick={() => setActiveModal('suprimento')} />
            <ActionButton icon={<MinusCircle size={20}/>} label="Sangria" onClick={() => setActiveModal('sangria')} />
            <ActionButton icon={<History size={20}/>} label="Histórico" onClick={() => setActiveModal('historico')} />
            
            <div className="w-px bg-slate-700 mx-2"></div>
            <ActionButton icon={<Lock size={20}/>} label="Fechar" onClick={() => setActiveModal('fechar')} danger />
        </div>
      </div>

      {/* MODAIS DE OPERAÇÃO */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto flex flex-col">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
                {activeModal === 'suprimento' && <PlusCircle className="text-green-600"/>}
                {activeModal === 'sangria' && <MinusCircle className="text-red-600"/>}
                {activeModal === 'historico' && <History className="text-blue-600"/>}
                {activeModal === 'fechar' && <Lock className="text-slate-800"/>}
                
                {activeModal === 'historico' ? 'Histórico / Estorno' : 
                 activeModal === 'fechar' ? 'Fechar Caixa' : `Registrar ${activeModal}`}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
            </div>

            {/* FORMULÁRIO SANGRIA / SUPRIMENTO */}
            {(activeModal === 'suprimento' || activeModal === 'sangria') && (
               <div className="space-y-4">
                 <div>
                   <label className="label">Valor (R$)</label>
                   <input type="number" step="0.01" autoFocus className="input-lg" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                 </div>
                 <div>
                   <label className="label">Motivo</label>
                   <input type="text" className="input-base" value={desc} onChange={e => setDesc(e.target.value)} placeholder={activeModal === 'sangria' ? "Ex: Pagamento Fornecedor" : "Ex: Troco adicional"} />
                 </div>
                 <button onClick={initiateTransaction} className={`btn-primary ${activeModal === 'sangria' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                   Confirmar (Requer Senha)
                 </button>
               </div>
            )}

            {/* LISTA DE HISTÓRICO E ESTORNO */}
            {activeModal === 'historico' && (
              <div className="space-y-2 overflow-y-auto min-h-[300px]">
                {loadingHistory ? (
                   <div className="text-center py-10 text-slate-400">Carregando...</div>
                ) : salesHistory.length === 0 ? (
                   <div className="text-center py-10 text-slate-400">Nenhuma venda nesta sessão.</div>
                ) : (
                  salesHistory.map(sale => (
                    <div key={sale.id} className={`flex justify-between items-center p-3 rounded-lg border ${sale.status === 'cancelado' ? 'bg-red-50 border-red-100 opacity-75' : 'bg-white border-slate-100'}`}>
                      <div>
                        <p className={`font-bold text-sm ${sale.status === 'cancelado' ? 'text-red-800 line-through' : 'text-slate-700'}`}>
                          {sale.customer_name || 'Varejo'}
                        </p>
                        {/* CORREÇÃO AQUI: Proteção contra null no payment_method */}
                        <p className="text-xs text-slate-400">
                          {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {(sale.payment_method || 'PENDENTE').toUpperCase()}
                        </p>
                        {sale.status === 'cancelado' && <span className="text-[10px] text-red-600 font-bold uppercase">Cancelado</span>}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold ${sale.status === 'cancelado' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          R$ {sale.total.toFixed(2)}
                        </span>
                        
                        {sale.status !== 'cancelado' && (
                          <button 
                            onClick={() => initiateCancelSale(sale)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Estornar Venda (Requer Senha)"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div className="bg-blue-50 p-3 rounded-lg flex gap-2 items-start mt-4">
                  <AlertTriangle size={16} className="text-blue-500 shrink-0 mt-0.5"/>
                  <p className="text-xs text-blue-700">
                    O cancelamento estorna o valor do caixa e devolve os produtos ao estoque automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* FORMULÁRIO FECHAMENTO */}
            {activeModal === 'fechar' && (
               <div className="space-y-4">
                 <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 text-sm mb-4">
                    Confira o dinheiro físico na gaveta antes de encerrar.
                 </div>
                 <div>
                   <label className="label">Valor em Dinheiro na Gaveta (R$)</label>
                   <input type="number" step="0.01" autoFocus className="input-lg" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} placeholder="0.00" />
                 </div>
                 <div>
                   <label className="label">Observações</label>
                   <textarea className="input-base h-20" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Diferenças, quebras..." />
                 </div>
                 <button onClick={handleCloseBox} className="btn-primary bg-slate-900 hover:bg-slate-800">
                   Encerrar Dia
                 </button>
               </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}

function ActionButton({ icon, label, onClick, danger }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 min-w-[60px] p-1 rounded-lg transition-colors ${danger ? 'text-red-400 hover:bg-red-500/20' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}