import { useState } from 'react'
import { X, Receipt, Banknote, CreditCard, QrCode, Trash2, Loader2, Check } from 'lucide-react'

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
  isProcessing 
}) {
  const [amountInput, setAmountInput] = useState('')

  const triggerAddPayment = (method) => {
    let val = parseFloat(amountInput)
    // Se vazio ou zero, assume o restante da conta
    if (!val || val <= 0) val = remainingDue
    
    if (val > 0) {
        onAddPayment(method, val.toFixed(2))
        setAmountInput('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* RESUMO (ESQUERDA) */}
        <div className="w-1/3 bg-slate-50 p-6 border-r border-slate-200 flex flex-col">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <Receipt size={20}/> Resumo do Pedido
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-slate-200 pb-1">
                <span className="truncate w-32">{item.quantity}x {item.product.name}</span>
                <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal</span> <span>R$ {subtotalRaw.toFixed(2)}</span>
            </div>
            {serviceFeeValue > 0 && (
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Serviço (10%)</span> <span>R$ {serviceFeeValue.toFixed(2)}</span>
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
                className="px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
              >
                Tudo
              </button>
            </div>
          </div>

          {/* GRID DE BOTÕES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <PaymentMethodBtn 
              icon={<Banknote/>} 
              label="Dinheiro" 
              onClick={() => triggerAddPayment('dinheiro')} 
              color="bg-green-50 text-green-700 hover:bg-green-100 border-green-200" 
            />
            <PaymentMethodBtn 
              icon={<CreditCard/>} 
              label="Crédito" 
              onClick={() => triggerAddPayment('credito')} 
              color="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
            />
            <PaymentMethodBtn 
              icon={<CreditCard/>} 
              label="Débito" 
              onClick={() => triggerAddPayment('debito')} 
              color="bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200" 
            />
            <PaymentMethodBtn 
              icon={<QrCode/>} 
              label="PIX" 
              onClick={() => triggerAddPayment('pix')} 
              color="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" 
            />
          </div>

          {/* LISTA DE PAGAMENTOS REALIZADOS */}
          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4 overflow-y-auto">
            {payments.length === 0 && <div className="text-center text-slate-400 mt-4">Nenhum pagamento lançado.</div>}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 mb-2 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="uppercase font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{p.payment_method}</span>
                  <span className="font-bold text-slate-700">R$ {Number(p.amount).toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => onRemovePayment(p.id)} 
                  className="text-red-400 hover:text-red-600" 
                  title="Cancelar Pagamento"
                >
                  <Trash2 size={18}/>
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
                <div className="text-green-600 font-bold text-xl bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                  Troco: R$ {changeDue.toFixed(2)}
                </div>
              )}
            </div>

            <button 
              onClick={onFinishSale}
              disabled={isProcessing || remainingDue > 0.01}
              className="w-full py-4 bg-green-600 text-white text-xl font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center gap-3 transition-all"
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
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 ${color}`}>
      <div className="mb-1 scale-125">{icon}</div>
      <span className="font-bold text-xs uppercase">{label}</span>
    </button>
  )
}