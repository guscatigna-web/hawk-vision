import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, MoreHorizontal, UserPlus, Loader2, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js' 
import { NewEmployeeModal } from '../components/NewEmployeeModal'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function Equipe() {
  const navigate = useNavigate()
  const { user } = useAuth() 
  
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [employeeToEdit, setEmployeeToEdit] = useState(null)
  
  const [menuOpenId, setMenuOpenId] = useState(null)

  // 1. Busca Funcionários
  const fetchEmployees = useCallback(async () => {
    if (!user?.company_id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', user.company_id) 
        .order('name')
      
      if (error) throw error
      if (data) setEmployees(data)
    } catch (error) {
      console.error('Erro ao buscar equipe:', error)
      toast.error('Erro ao carregar lista de funcionários')
    } finally {
      setLoading(false)
    }
  }, [user?.company_id]) 

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // 2. Função Inteligente de Salvamento
  async function handleSaveEmployee(formData) {
    try {
      // --- MODO EDIÇÃO ---
      if (formData.id) {
        const { error } = await supabase
          .from('employees')
          .update({
             name: formData.name,
             role: formData.role,
             email: formData.email,
             phone: formData.phone,
             access_pin: formData.access_pin,
             password: formData.password
          })
          .eq('id', formData.id)

        if (error) throw error
        toast.success('Funcionário atualizado!')
      } 
      
      // --- MODO CRIAÇÃO ---
      else {
        if (!formData.email || !formData.password) {
           throw new Error("Email e Senha são obrigatórios para novos funcionários.")
        }

        // CORREÇÃO DEFINITIVA DO AVISO "Multiple GoTrueClient":
        // Injetamos um storage "fake" em memória para que este cliente temporário
        // NUNCA tente acessar o LocalStorage do navegador, evitando conflito de chaves.
        const supabaseTemp = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
              storage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
              }
            }
          }
        )

        const { data: authData, error: authError } = await supabaseTemp.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { name: formData.name }
          }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error("Erro ao gerar ID de autenticação.")

        const { error: dbError } = await supabase
          .from('employees')
          .insert({
            auth_user_id: authData.user.id,
            company_id: user.company_id, 
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            phone: formData.phone,
            access_pin: formData.access_pin,
            status: 'Ativo',
            admission_date: new Date().toISOString(),
            avatar: getAvatarByRole(formData.role)
          })

        if (dbError) {
          if (dbError.code === '23505') {
             throw new Error("Este e-mail já está cadastrado como funcionário.")
          }
          console.error("Erro no banco:", dbError)
          throw dbError
        }

        toast.success('Funcionário cadastrado com sucesso!')
      }

      fetchEmployees()
      setIsModalOpen(false)
      setEmployeeToEdit(null)

    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro: ' + (error.message || 'Falha ao salvar'))
    }
  }

  function getAvatarByRole(role) {
    if (role === 'Gerente' || role === 'Master') return '👔'
    if (role === 'Cozinha') return '👨‍🍳'
    if (role === 'Garçom') return '💁'
    if (role === 'Caixa') return '💻'
    return '👤'
  }

  async function handleDelete(id) {
    if(!confirm("Tem certeza que deseja excluir este funcionário?")) return

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
      
      toast.success('Funcionário removido')
      fetchEmployees()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir (Pode ser protegido pelo sistema)')
    }
  }

  // --- FILTRAGEM ---
  const filteredEmployees = employees.filter(emp => {
    // 1. Oculta Master (Sempre)
    if (emp.role === 'Master') return false;
    
    // 2. Filtro de Busca
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesSearch;
  })

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Equipe</h1>
          <p className="text-sm text-slate-500">Gerencie seus colaboradores</p>
        </div>
        
        {/* Botão Novo Colaborador */}
        <button 
          onClick={() => { setEmployeeToEdit(null); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-slate-900 text-white px-4 py-3 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm active:scale-95"
        >
          <UserPlus size={20} />
          <span className="font-bold">Novo Colaborador</span>
        </button>
      </div>

      {/* BARRA DE BUSCA RESPONSIVA */}
      <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou cargo..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center gap-2 md:gap-0">
          <Filter size={20} /> <span className="md:hidden text-sm font-bold">Filtros</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <Loader2 className="animate-spin text-amber-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 md:p-6 flex flex-col items-center text-center relative group">
              
              <div className="absolute top-2 right-2 md:top-4 md:right-4">
                 <button onClick={() => setMenuOpenId(menuOpenId === employee.id ? null : employee.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                    <MoreHorizontal size={20} />
                 </button>
                 
                 {menuOpenId === employee.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-100 rounded-lg shadow-xl z-10 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button 
                          onClick={() => { 
                             setEmployeeToEdit(employee); 
                             setIsModalOpen(true); 
                             setMenuOpenId(null); 
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                        >
                           <Edit size={14}/> Editar
                        </button>
                        <button 
                          onClick={() => { handleDelete(employee.id); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                           <Trash2 size={14}/> Excluir
                        </button>
                    </div>
                 )}
              </div>

              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl md:text-3xl mb-3 md:mb-4 text-slate-600 border-4 border-slate-50 shadow-inner">
                {employee.avatar || '👤'}
              </div>
              
              <h3 className="text-base md:text-lg font-bold text-slate-800 leading-tight mb-1">{employee.name}</h3>
              <p className="text-slate-500 text-xs md:text-sm font-medium mb-3 bg-slate-50 px-2 py-0.5 rounded-md">{employee.role}</p>
              
              <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide ${
                employee.status === 'Ativo' ? 'bg-green-100 text-green-700' : 
                employee.status === 'Férias' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {employee.status}
              </span>

              <button 
                onClick={() => navigate(`/funcionarios/${employee.id}`)}
                className="mt-4 md:mt-6 w-full py-2.5 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 font-bold text-xs md:text-sm transition-colors border border-slate-200"
              >
                Ver Detalhes
              </button>
            </div>
          ))}
        </div>
      )}

      <NewEmployeeModal 
        key={employeeToEdit ? employeeToEdit.id : 'new'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        employeeToEdit={employeeToEdit}
      />
    </div>
  )
}