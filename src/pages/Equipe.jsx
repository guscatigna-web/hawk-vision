import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, MoreHorizontal, UserPlus, Loader2, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
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

  async function fetchEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    
    if (error) console.error('Erro ao buscar equipe:', error)
    if (data) setEmployees(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  async function handleSaveEmployee(employeeData) {
    try {
      if (employeeData.id) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employeeData.id)
        if (error) throw error
        toast.success('Dados atualizados!')
      } else {
        const { error } = await supabase.from('employees').insert([employeeData])
        if (error) throw error
        toast.success('Colaborador cadastrado!')
      }
      
      fetchEmployees()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar.')
    }
  }

  async function handleDeleteEmployee(id) {
    if (!confirm('Tem certeza que deseja remover este colaborador? O histórico será perdido.')) return

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
      toast.success('Colaborador removido.')
      fetchEmployees()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao remover.')
    }
  }

  function openEdit(employee) {
    setEmployeeToEdit(employee)
    setIsModalOpen(true)
    setMenuOpenId(null)
  }

  function openCreate() {
    setEmployeeToEdit(null)
    setIsModalOpen(true)
  }

  // --- SOLUÇÃO DO FUSO HORÁRIO ---
  const formatDate = (dateString) => {
    if (!dateString) return 'Data N/A';
    // Pega apenas a parte YYYY-MM-DD, ignorando qualquer hora ou fuso
    const cleanDate = dateString.split('T')[0];
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mr-2" /> Carregando equipe...
      </div>
    )
  }

  return (
    <div className="space-y-6" onClick={() => setMenuOpenId(null)}> 

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Equipe</h2>
          <p className="text-sm text-slate-500">Gerencie colaboradores e acessos.</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); openCreate(); }} 
          className="flex items-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <UserPlus size={20} className="mr-2" />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou cargo..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col items-center text-center relative group">
            
            <div className="absolute top-4 right-4"> 
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  setMenuOpenId(menuOpenId === employee.id ? null : employee.id);
                }}
                className="text-slate-300 hover:text-blue-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>

              {menuOpenId === employee.id && (
                <div className="absolute right-0 top-10 bg-white shadow-xl border border-slate-100 rounded-lg w-32 z-10 overflow-hidden animate-fade-in">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEdit(employee); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    <Edit size={14} className="mr-2"/> Editar
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(employee.id); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 size={14} className="mr-2"/> Excluir
                  </button>
                </div>
              )}
            </div>

            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 text-slate-600 border-2 border-white shadow-sm">
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

            <div className="mt-6 w-full border-t border-slate-50 pt-4 flex justify-between text-sm text-slate-500">
               <span>
                 {/* AQUI APLICAMOS A CORREÇÃO DE DATA */}
                 Desde: {formatDate(employee.admission_date)}
               </span>
            </div>
            
            <button 
              onClick={() => navigate(`/funcionarios/${employee.id}`)}
              className="mt-4 w-full py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Ver Perfil
            </button>
          </div>
        ))}
      </div>

      <NewEmployeeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        employeeToEdit={employeeToEdit} 
      />

    </div>
  )
}