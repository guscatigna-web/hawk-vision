import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, Calendar, Loader2, History } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../utils/dateUtils'
import toast from 'react-hot-toast'

export function EmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Envolvemos a função no useCallback para ela ser estável
  const fetchEmployeeData = useCallback(async () => {
    try {
      // 1. Busca dados do funcionário
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single()
      
      if (empError) throw empError
      setEmployee(empData)

      // 2. Busca histórico recente (Vendas, Movimentações, etc)
      const { data: historyData, error: histError } = await supabase
        .from('sales')
        .select('*')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!histError) {
        setHistory(historyData || [])
      }

    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar funcionário.")
      navigate('/equipe')
    } finally {
      setLoading(false)
    }
  }, [id, navigate]) // Recria a função apenas se o ID mudar

  // 2. Agora podemos usar a função como dependência com segurança
  useEffect(() => {
    fetchEmployeeData()
  }, [fetchEmployeeData])

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>

  if (!employee) return null

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/equipe')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{employee.name}</h2>
          <p className="text-sm text-slate-500">{employee.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARTÃO DE PERFIL */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <User size={48} />
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              employee.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {employee.status}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail size={18} className="text-slate-400" />
              <span className="text-sm">{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone size={18} className="text-slate-400" />
              <span className="text-sm">{employee.phone || 'Sem telefone'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-sm">Admitido em: {new Date(employee.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* HISTÓRICO DE ATIVIDADES */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <History size={18} className="text-slate-500"/>
            <h3 className="font-bold text-slate-700">Histórico de Vendas Recentes</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Pagamento</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400">
                      Nenhuma atividade recente encontrada.
                    </td>
                  </tr>
                ) : (
                  history.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm text-slate-500">{formatDateTime(sale.created_at)}</td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-700">{sale.customer_name || 'Varejo'}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 capitalize">{sale.payment_method}</td>
                      <td className="px-6 py-3 text-sm text-right font-bold text-green-600">
                        R$ {sale.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}