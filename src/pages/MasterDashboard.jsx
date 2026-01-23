import { useState, useEffect } from 'react'
import { 
  Building2, 
  Search, 
  LogIn, 
  Users, 
  ShieldCheck, 
  Activity, 
  Plus, 
  Loader2, 
  MapPin, 
  Calendar 
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function MasterDashboard() {
  // CORREÇÃO: Removido 'user' do destructuring pois não estava sendo utilizado
  const { impersonateCompany } = useAuth() 
  const navigate = useNavigate()
  
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    try {
      // Busca todas as empresas
      // O SQL do passo 1 garante que o Master vê tudo aqui
      const { data, error } = await supabase
        .from('companies')
        .select(`
            *,
            employees:employees(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao buscar lista de lojas')
    } finally {
      setLoading(false)
    }
  }

  const handleAccess = async (company) => {
    // Validação para garantir que o Passo 3 foi feito
    if (!impersonateCompany) {
        toast.error("Função de acesso não configurada no AuthContext (Passo 3)")
        return
    }

    if (confirm(`Deseja acessar o painel administrativo da empresa "${company.name}"?`)) {
        await impersonateCompany(company)
    }
  }

  const filtered = companies.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.document || '').includes(searchTerm)
  )

  if (loading) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 animate-fade-in">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <ShieldCheck className="text-amber-500" size={32} /> Painel Master
            </h1>
            <p className="text-slate-500 mt-1">Visão global de todos os tenants do sistema.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-bold text-slate-700">{companies.length} Lojas Ativas</span>
            </div>
            
            {/* Botão para ir para a tela de Criação (SuperAdmin) */}
            <button 
                onClick={() => navigate('/super-admin')} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-600/20 transition-all"
            >
                <Plus size={20} /> Novo Cliente
            </button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="max-w-7xl mx-auto mb-8 relative">
        <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar por nome da loja, CNPJ ou ID..." 
                className="w-full pl-12 pr-4 py-4 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-amber-500 bg-white text-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Grid de Lojas */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400">
                Nenhuma loja encontrada para "{searchTerm}"
            </div>
        )}

        {filtered.map(company => (
            <div key={company.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all group flex flex-col justify-between h-full">
                
                {/* Topo do Card */}
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                            <Building2 size={24} />
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${company.status === 'inactive' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {company.status || 'Ativo'}
                        </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 mb-1 line-clamp-1" title={company.name}>
                        {company.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-mono mb-4">
                        {company.document || 'CNPJ não informado'}
                    </p>

                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <MapPin size={16} className="text-slate-400"/>
                            <span className="truncate">{company.city || 'Local não informado'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar size={16} className="text-slate-400"/>
                            <span>Criado em {new Date(company.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                </div>

                {/* Rodapé do Card */}
                <div className="pt-4 border-t border-slate-50 mt-auto">
                    <div className="flex justify-between items-center mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                            <Users size={14} />
                            {company.employees?.[0]?.count || 0} Usuários
                        </div>
                        <div className="flex items-center gap-1 text-amber-600">
                            <Activity size={14} />
                            Plano Pro
                        </div>
                    </div>

                    <button 
                        onClick={() => handleAccess(company)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-900 text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        <LogIn size={18} /> Acessar Loja
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}