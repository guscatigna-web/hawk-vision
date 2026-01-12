import { useState } from 'react'
import { Lock, Loader2, CheckCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function AuthModal({ isOpen, onClose, onSuccess, title = "Autorização Necessária", message = "Esta ação requer aprovação de um gerente." }) {
  const { user } = useAuth()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  // Se o usuário logado JÁ É gerente, aprovamos automaticamente sem mostrar o modal?
  // R: Geralmente sim, para agilidade. Mas se quiser rigor, pode remover este bloco.
  if (user?.role === 'Gerente' && isOpen) {
      onSuccess(user)
      onClose()
      return null
  }

  if (!isOpen) return null

  const handleAuthorize = async (e) => {
    e.preventDefault()
    if (!pin) return toast.error("Digite a senha")

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('role', 'Gerente')
        .eq('access_pin', pin)
        .eq('active', true)
        .limit(1)
        .single()

      if (error || !data) {
        toast.error("Senha inválida ou sem permissão")
        setPin('')
      } else {
        toast.success(`Autorizado por ${data.name}`)
        onSuccess(data) // Retorna quem autorizou
        onClose()
        setPin('')
      }
    } catch (err) {
      console.error(err)
      toast.error("Erro de verificação")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
        
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 p-4 rounded-full">
            <Lock className="text-amber-600 w-10 h-10" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>

        <form onSubmit={handleAuthorize} className="space-y-4">
          <input 
            type="password" 
            autoFocus
            inputMode="numeric"
            placeholder="Senha (PIN)"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full text-center text-3xl font-bold tracking-widest p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-amber-500 transition-all"
            maxLength={6}
          />

          <button 
            type="submit"
            disabled={loading || !pin}
            className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin"/> : <CheckCircle size={20}/>}
            Autorizar
          </button>
        </form>
      </div>
    </div>
  )
}