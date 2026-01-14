import { useState } from 'react'
import { Shield, Building2, User, Mail, Lock, Zap, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// 🔒 SEGURANÇA: Coloque aqui o SEU e-mail de Super Admin
// Apenas este e-mail terá permissão para ver esta tela.
const MASTER_EMAIL = 'master@hawk.com' // <--- ALTERE AQUI

export function SuperAdmin() {
  const { user, loading } = useAuth()
  
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  // 1. Proteção de Rota (Loading)
  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>

  // 2. Proteção de Rota (Acesso Negado)
  // Se não estiver logado ou o e-mail não for o Mestre, chuta para fora.
  if (!user || user.email !== MASTER_EMAIL) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Shield size={64} className="text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
        <p>Esta área é exclusiva para administração do Hawk Vision.</p>
        <a href="/" className="text-blue-600 hover:underline">Voltar ao Sistema</a>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const toastId = toast.loading('Criando novo universo...')

    try {
      // 3. Chamada à Edge Function "create-tenant"
      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: formData
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      toast.success('Cliente criado com sucesso!', { id: toastId })
      
      setLastResult({
        companyId: data.data.companyId,
        email: formData.email,
        name: formData.restaurantName
      })

      // Limpa formulário
      setFormData({ restaurantName: '', ownerName: '', email: '', password: '' })

    } catch (error) {
      console.error(error)
      toast.error(`Erro: ${error.message}`, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center">
      
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/50">
            <Zap size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Hawk Vision Master
            </h1>
            <p className="text-slate-400">Painel de Criação de Tenants (SaaS)</p>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO */}
        {lastResult && (
          <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl mb-8 animate-fade-in-down">
            <div className="flex items-start gap-4">
              <CheckCircle className="text-green-400 mt-1" size={24} />
              <div>
                <h3 className="text-xl font-bold text-green-400 mb-2">Restaurante Criado!</h3>
                <div className="space-y-1 text-sm text-green-200/80 font-mono bg-green-900/30 p-4 rounded-lg">
                  <p>Empresa: <span className="text-white">{lastResult.name}</span></p>
                  <p>ID da Empresa (Tenant ID): <span className="text-yellow-300 font-bold">{lastResult.companyId}</span></p>
                  <p>Login Admin: <span className="text-white">{lastResult.email}</span></p>
                </div>
                <p className="mt-4 text-sm text-green-300">
                  O cliente já pode logar. O vínculo Auth x Tabela foi criado automaticamente.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setLastResult(null)} 
              className="mt-4 text-xs uppercase font-bold text-green-500 hover:text-green-400"
            >
              Fechar Aviso
            </button>
          </div>
        )}

        {/* FORMULÁRIO */}
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Building2 className="text-blue-500"/> Novo Cliente
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Restaurante</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Pizzaria Suprema"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={formData.restaurantName}
                    onChange={e => setFormData({...formData, restaurantName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Dono</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={formData.ownerName}
                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-700 my-4"></div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail de Login (Admin)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  required
                  type="email" 
                  placeholder="admin@cliente.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha Inicial</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  required
                  type="text" 
                  placeholder="Defina uma senha forte"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-colors font-mono"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <AlertTriangle size={12} className="text-yellow-500"/>
                Anote a senha! Você deverá entregá-la ao cliente.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Zap size={20}/> Criar Cliente SaaS</>}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}