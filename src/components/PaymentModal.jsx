import { useState, useEffect } from 'react'
import { X, Receipt, Banknote, CreditCard, QrCode, Trash2, Loader2, Check, Wallet, Users } from 'lucide-react'
import { supabase } from '../lib/supabase' // Import necessário para buscar do banco

export function PaymentModal({ 
  onClose, 
  payments, 
  grandTotalFinal, 
  remainingDue, 
  changeDue, 
  items, 
  subtotalRaw, 
  serviceFeeValue, 
  discountValue, 
  discountReason, 
  onAddPayment, 
  onRemovePayment, 
  onFinishSale, 
  isProcessing,
  currentPeopleCount = 1 // Recebe o valor atual
}) {
  const [amountInput, setAmountInput] = useState('')
  const [peopleCount, setPeopleCount] = useState(currentPeopleCount) // Estado local para pax
  const [availableMethods, setAvailableMethods] = useState([])
  const [loadingMethods, setLoadingMethods] = useState(true)

  // 1. BUSCA MÉTODOS CADASTRADOS NO BANCO
  useEffect(() => {
    async function fetchMethods() {
      try {
        const { data } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('active', true)
          .order('name')
        
        setAvailableMethods(data || [])
      } catch (error) {
        console.error("Erro ao buscar métodos:", error)
      } finally {
        setLoadingMethods(false)
      }
    }
    fetchMethods()
  }, [])

  const triggerAddPayment = (methodName) => {
    let val = parseFloat(amountInput)
    // Se vazio ou zero, assume o restante da conta
    if (!val || val <= 0) val = remainingDue
    
    if (val > 0) {
        // Envia o nome exato que veio do banco
        onAddPayment(methodName, val.toFixed(2))
        setAmountInput('')
    }
  }

  // Wrapper para enviar o Nº Pessoas junto com a finalização
  const handleFinish = () => {
      onFinishSale(peopleCount) // Passa o pax atualizado de volta
  }

  // 2. HELPER PARA ESCOLHER ÍCONE E COR BASEADO NO NOME
  const getMethodStyle = (name) => {
    const n = name.toLowerCase()
    if (n.includes('dinheiro') || n.includes('especie')) return { icon: <Banknote size={24}/>, color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' }
    if (n.includes('pix')) return { icon: <QrCode size={24}/>, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' }
    if (n.includes('credito') || n.includes('crédito')) return { icon: <CreditCard size={24}/>, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' }
    if (n.includes('debito') || n.includes('débito')) return { icon: <CreditCard size={24}/>, color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' }
    
    // Padrão para outros (Voucher, Ifood, etc)
    return { icon: <Wallet size={24}/>, color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* RESUMO (ESQUERDA) */}
        <div className="w-1/3 bg-slate-50 p-6 border-r border-slate-200 flex flex-col">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <Receipt size={20}/> Resumo do Pedido
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-slate-200 pb-1">
                <span className="truncate w-32">{item.quantity}x {item.product.name}</span>
                <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* CONTROLE DE PESSOAS & DIVISÃO DE CONTA (NOVO) */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 mb-4">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Users size={14}/> Pessoas</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))} className="w-6 h-6 bg-slate-100 rounded font-bold text-slate-600 hover:bg-slate-200">-</button>
                    <span className="font-bold text-slate-800 w-4 text-center">{peopleCount}</span>
                    <button onClick={() => setPeopleCount(peopleCount + 1)} className="w-6 h-6 bg-slate-100 rounded font-bold text-slate-600 hover:bg-slate-200">+</button>
                </div>
             </div>
             {/* CÁLCULO DA DIVISÃO */}
             <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">Valor por pessoa:</span>
                <span className="text-sm font-bold text-blue-600">
                    R$ {(grandTotalFinal / (peopleCount || 1)).toFixed(2)}
                </span>
             </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal</span> <span>R$ {subtotalRaw.toFixed(2)}</span>
            </div>
            {serviceFeeValue > 0 && (
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Serviço</span> <span>R$ {serviceFeeValue.toFixed(2)}</span>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between text-red-500 text-sm font-bold">
                <span>Desconto ({discountReason})</span> <span>- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-bold text-xl pt-2 border-t border-slate-200">
              <span>Total</span> <span>R$ {grandTotalFinal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PAGAMENTO (DIREITA) */}
        <div className="flex-1 p-8 flex flex-col bg-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Pagamento</h2>
              <p className="text-slate-500">Selecione as formas de pagamento.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X size={24} />
            </button>
          </div>

          {/* INPUT VALOR */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-500 mb-1 uppercase">Valor a Lançar</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  autoFocus
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  placeholder={remainingDue.toFixed(2)}
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-slate-800 border-2 border-blue-100 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all placeholder:text-slate-200"
                />
              </div>
              <button 
                onClick={() => setAmountInput(remainingDue.toFixed(2))} 
                className="px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 active:scale-95 transition-transform"
              >
                Tudo
              </button>
            </div>
          </div>

          {/* GRID DE BOTÕES (DINÂMICO) */}
          {loadingMethods ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 overflow-y-auto max-h-60 custom-scrollbar pr-1">
              {availableMethods.length === 0 && (
                <div className="col-span-full text-center text-slate-400 py-4 italic border-2 border-dashed border-slate-100 rounded-lg">
                  Nenhuma forma de pagamento cadastrada em Configurações.
                </div>
              )}
              
              {availableMethods.map((method) => {
                const style = getMethodStyle(method.name)
                return (
                  <PaymentMethodBtn 
                    key={method.id}
                    icon={style.icon}
                    label={method.name} 
                    onClick={() => triggerAddPayment(method.name)} 
                    color={style.color} 
                  />
                )
              })}
            </div>
          )}

          {/* LISTA DE PAGAMENTOS REALIZADOS */}
          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4 overflow-y-auto custom-scrollbar">
            {payments.length === 0 && <div className="text-center text-slate-400 mt-4 text-sm">Nenhum pagamento lançado nesta venda.</div>}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 mb-2 shadow-sm animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    {getMethodStyle(p.payment_method).icon}
                  </div>
                  <div>
                    <span className="uppercase font-bold text-xs text-slate-500 block">{p.payment_method}</span>
                    <span className="font-bold text-slate-800 text-lg">R$ {Number(p.amount).toFixed(2)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => onRemovePayment(p.id)} 
                  className="text-red-300 hover:text-red-500 p-2 hover:bg-red-50 rounded transition-colors" 
                  title="Cancelar Pagamento"
                >
                  <Trash2 size={20}/>
                </button>
              </div>
            ))}
          </div>

          {/* RODAPÉ E AÇÃO FINAL */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-slate-500">
                Restante: <span className={`font-bold ${remainingDue > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                  R$ {remainingDue.toFixed(2)}
                </span>
              </div>
              {changeDue > 0 && (
                <div className="text-green-600 font-bold text-xl bg-green-50 px-4 py-2 rounded-lg border border-green-100 animate-bounce-short">
                  Troco: R$ {changeDue.toFixed(2)}
                </div>
              )}
            </div>

            <button 
              onClick={handleFinish} // Usa o novo handler que envia as pessoas
              disabled={isProcessing || remainingDue > 0.01}
              className="w-full py-4 bg-green-600 text-white text-xl font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center gap-3 transition-all active:scale-[0.98]"
            >
              {isProcessing ? <Loader2 className="animate-spin"/> : <Check size={28} strokeWidth={3}/>}
              CONCLUIR VENDA
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// Sub-componente interno para os botões
function PaymentMethodBtn({ icon, label, onClick, color }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 hover:shadow-md ${color}`}>
      <div className="mb-2 scale-110">{icon}</div>
      <span className="font-bold text-xs uppercase text-center leading-tight">{label}</span>
    </button>
  )
}