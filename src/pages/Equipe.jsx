import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, MoreHorizontal, UserPlus, Loader2, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js' 
import { NewEmployeeModal } from '../components/NewEmployeeModal'
import toast from 'react-hot-toast'

export function Equipe() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [employeeToEdit, setEmployeeToEdit] = useState(null)
  
  const [menuOpenId, setMenuOpenId] = useState(null)

  // 1. Busca Funcionários
  async function fetchEmployees() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name')
      
      if (error) throw error
      if (data) setEmployees(data)
    } catch (error) {
      console.error('Erro ao buscar equipe:', error)
      toast.error('Erro ao carregar lista de funcionários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

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

        // Cliente temporário para não deslogar o Admin
        const supabaseTemp = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        )

        // Criar Usuário no Auth
        const { data: authData, error: authError } = await supabaseTemp.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { name: formData.name }
          }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error("Erro ao gerar ID de autenticação.")

        // Pegar a empresa do Admin logado
        const { data: { user: adminUser } } = await supabase.auth.getUser()
        
        const { data: adminEmployee } = await supabase
            .from('employees')
            .select('company_id')
            .eq('auth_user_id', adminUser.id)
            .single()
            
        const targetCompanyId = adminEmployee?.company_id || 1

        // Inserir na tabela employees com o UUID correto
        const { error: dbError } = await supabase
          .from('employees')
          .insert({
            auth_user_id: authData.user.id,
            company_id: targetCompanyId,
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
          console.error("Erro no banco, usuário Auth criado orfão:", authData.user.id)
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
      console.error(error) // <--- Correção do 'unused variable'
      toast.error('Erro ao excluir')
    }
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
          <p className="text-slate-500">Gerencie seus colaboradores</p>
        </div>
        <button 
          onClick={() => { setEmployeeToEdit(null); setIsModalOpen(true); }}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <UserPlus size={20} />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou cargo..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
          <Filter size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <Loader2 className="animate-spin text-amber-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center text-center relative group">
              
              <div className="absolute top-4 right-4">
                 <button onClick={() => setMenuOpenId(menuOpenId === employee.id ? null : employee.id)} className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal size={20} />
                 </button>
                 
                 {menuOpenId === employee.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-100 rounded-lg shadow-xl z-10 py-1 overflow-hidden">
                        <button 
                          onClick={() => { 
                             setEmployeeToEdit(employee); 
                             setIsModalOpen(true); 
                             setMenuOpenId(null); 
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                        >
                           <Edit size={14}/> Editar
                        </button>
                        <button 
                          onClick={() => { handleDelete(employee.id); setMenuOpenId(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                           <Trash2 size={14}/> Excluir
                        </button>
                    </div>
                 )}
              </div>

              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 text-slate-600 border-2 border-white shadow-sm">
                {employee.avatar || '👤'}
              </div>
              
              <h3 className="text-lg font-bold text-slate-800">{employee.name}</h3>
              <p className="text-slate-500 text-sm font-medium mb-3">{employee.role}</p>
              
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                employee.status === 'Ativo' ? 'bg-green-100 text-green-700' : 
                employee.status === 'Férias' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {employee.status}
              </span>

              <button 
                onClick={() => navigate(`/funcionarios/${employee.id}`)}
                className="mt-6 w-full py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 font-medium text-sm transition-colors border border-slate-100"
              >
                Ver Detalhes
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CORREÇÃO IMPORTANTE: key={employeeToEdit?.id || 'new'}
         Isso força o componente a reiniciar o estado quando muda o funcionário,
         eliminando a necessidade do useEffect problemático no filho.
      */}
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