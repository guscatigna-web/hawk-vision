import { useState, useEffect, useRef } from 'react'
import { X, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthModal({ isOpen, onClose, onSuccess, title, message }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setError(null)
      // Foca no input automaticamente ao abrir
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!pin) return

    setLoading(true)
    setError(null)

    try {
      // Chama a função segura no banco (RPC)
      const { data, error: rpcError } = await supabase.rpc('verify_employee_pin', { 
        pin_attempt: pin 
      })

      if (rpcError) throw rpcError

      if (data && data.success) {
        // Sucesso! Retorna os dados do funcionário para quem chamou
        onSuccess(data.employee)
        onClose()
      } else {
        setError('PIN incorreto ou não encontrado.')
        setPin('')
      }

    } catch (err) {
      console.error(err)
      setError(err.message || 'Erro ao verificar permissão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-bounce-in">
        
        <div className="bg-slate-900 p-6 text-center relative">
          <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-slate-700 shadow-inner">
            <Lock className="text-amber-400" size={32} />
          </div>
          <h3 className="text-white font-bold text-lg">{title || 'Autorização Necessária'}</h3>
          <p className="text-slate-400 text-xs mt-1">{message || 'Digite seu PIN para continuar'}</p>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-6 bg-white">
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              PIN de Segurança
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError(null)
              }}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-widest font-bold p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 placeholder:text-slate-200 transition-all"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-shake">
              <AlertCircle size={16} />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 2}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> Confirmar Autorização</>}
          </button>
        </form>
      </div>
    </div>
  )
}