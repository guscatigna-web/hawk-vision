import { useState } from 'react'
import { Tag, X, Percent, DollarSign, Lock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function DiscountModal({ onClose, discountsList, setDiscount, subtotal }) {
  const { user } = useAuth()
  const isManager = user?.role === 'Gerente'

  // Estados do Modal
  const [view, setView] = useState('selection') // 'selection' | 'auth'
  const [activeTab, setActiveTab] = useState('fixed') // 'fixed' | 'percentage'
  const [manualValue, setManualValue] = useState('')
  
  // Estado para Aprovação
  const [managerPin, setManagerPin] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [pendingDiscount, setPendingDiscount] = useState(null) // Guarda o desconto que o caixa tentou aplicar

  // Helpers de Cálculo para Feedback Visual
  const previewDiscountValue = () => {
    const val = parseFloat(manualValue) || 0
    if (activeTab === 'fixed') return val
    if (activeTab === 'percentage') return (subtotal * val) / 100
    return 0
  }

  // Ação de Aplicar
  const attemptApply = (type, value, reason) => {
    const discountObj = { type, value: parseFloat(value), reason }

    if (isManager) {
      // Se é gerente, aplica direto
      setDiscount(discountObj)
      onClose()
      toast.success('Desconto aplicado!')
    } else {
      // Se é caixa, pede senha
      setPendingDiscount(discountObj)
      setView('auth')
    }
  }

  // Ação de Autorizar (Backend Check)
  const handleAuthorize = async (e) => {
    e.preventDefault()
    if (!managerPin) return toast.error("Digite a senha do gerente")
    
    setAuthLoading(true)
    try {
      // Verifica se existe ALGUM gerente com esse PIN ativo
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('role', 'Gerente')
        .eq('access_pin', managerPin)
        .eq('active', true)
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        // Autorizado!
        const approver = data[0]
        setDiscount({
          ...pendingDiscount,
          reason: `${pendingDiscount.reason} (Aut: ${approver.name.split(' ')[0]})`
        })
        toast.success(`Autorizado por ${approver.name}`)
        onClose()
      } else {
        toast.error("Senha de gerente inválida")
        setManagerPin('')
      }
    } catch (error) {
      console.error(error)
      toast.error("Erro ao verificar permissão")
    } finally {
      setAuthLoading(false)
    }
  }

  // --- TELA DE SELEÇÃO DE DESCONTO ---
  if (view === 'selection') {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Tag size={20} className="text-blue-600"/> Aplicar Desconto
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            
            {/* Seletor de Tipo Manual */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button 
                onClick={() => setActiveTab('fixed')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'fixed' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <DollarSign size={16}/> Valor (R$)
              </button>
              <button 
                onClick={() => setActiveTab('percentage')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'percentage' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Percent size={16}/> Porcentagem (%)
              </button>
            </div>

            {/* Input Manual */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valor do Desconto</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00" 
                  value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  className="flex-1 p-3 border-2 border-slate-200 rounded-xl text-xl font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                />
                <button 
                  onClick={() => attemptApply(activeTab, manualValue, 'Manual')}
                  disabled={!manualValue || parseFloat(manualValue) <= 0}
                  className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isManager ? 'Aplicar' : <Lock size={16}/>}
                </button>
              </div>
              {/* Preview do Valor em R$ quando for % */}
              {activeTab === 'percentage' && manualValue > 0 && (
                <p className="text-xs text-slate-500 mt-2 text-right">
                  Isso descontará aprox. <span className="font-bold text-slate-700">R$ {previewDiscountValue().toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Lista de Pré-definidos */}
            {discountsList.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-100 pb-1">Descontos Rápidos</p>
                <div className="grid grid-cols-2 gap-3">
                  {discountsList.map(d => (
                    <button 
                      key={d.id} 
                      onClick={() => attemptApply(d.type, d.value, d.name)}
                      className="p-3 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all group active:scale-95"
                    >
                      <div className="font-bold text-slate-700 group-hover:text-blue-700">{d.name}</div>
                      <div className="text-xs font-bold text-slate-400 group-hover:text-blue-500">
                        {d.type === 'percentage' ? `${d.value}%` : `R$ ${d.value}`}
                        {!isManager && <Lock size={10} className="inline ml-1 mb-0.5"/>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button 
              onClick={() => { setDiscount({type:'fixed', value:0, reason:''}); onClose()}} 
              className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            >
              Remover Desconto Atual
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- TELA DE AUTORIZAÇÃO (PIN) ---
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
        
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 p-4 rounded-full">
            <Lock className="text-amber-600 w-10 h-10" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">Autorização Necessária</h3>
        <p className="text-slate-500 text-sm mb-6">Esta ação requer aprovação de um gerente. Peça para ele digitar a senha (PIN).</p>

        <form onSubmit={handleAuthorize} className="space-y-4">
          <input 
            type="password" 
            autoFocus
            inputMode="numeric"
            placeholder="Senha (PIN)"
            value={managerPin}
            onChange={e => setManagerPin(e.target.value)}
            className="w-full text-center text-3xl font-bold tracking-widest p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-amber-500"
            maxLength={6}
          />

          <button 
            type="submit"
            disabled={authLoading || !managerPin}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
          >
            {authLoading ? <Loader2 className="animate-spin"/> : <CheckCircle size={20}/>}
            Autorizar
          </button>
        </form>

        <button 
          onClick={() => setView('selection')} 
          className="mt-4 text-slate-400 hover:text-slate-600 text-sm font-medium underline"
        >
          Voltar / Cancelar
        </button>

      </div>
    </div>
  )
}