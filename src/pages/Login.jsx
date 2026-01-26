import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext' // Garanta que o caminho está certo
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    
    if (!email || !password) {
        toast.error('Preencha todos os campos')
        return
    }

    setIsSubmitting(true)

    try {
      // 1. O signIn do Context já retorna { user, session } ou null se falhar
      const result = await signIn(email, password)

      if (result && result.user) {
        // Sucesso! O AuthContext já vai redirecionar ou atualizar o estado
        navigate('/') 
      }
      // Se result for null, o AuthContext já exibiu o Toast de erro (senha errada etc)

    } catch (error) {
      console.error("Erro fatal no login:", error)
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        
        <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                <ShieldCheck className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Hawk Vision</h1>
            <p className="text-slate-400">Entre para gerenciar seu negócio</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">E-mail</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-500" size={20} />
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="seu@email.com"
                        autoFocus
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-slate-500" size={20} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Entrando...
                    </>
                ) : (
                    'Acessar Sistema'
                )}
            </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-8">
            Esqueceu a senha? Contate o suporte.
        </p>
      </div>
    </div>
  )
}