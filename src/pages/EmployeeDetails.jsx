import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, Calendar, Loader2, FileText, PlusCircle, TrendingUp, Shield, Printer, Trash2, UserX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../utils/dateUtils'
import { NewOccurrenceModal } from '../components/NewOccurrenceModal'
import { DisciplinaryDocument } from '../components/DisciplinaryDocument' 
import toast from 'react-hot-toast'

export function EmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [employee, setEmployee] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)
  const [salesHistory, setSalesHistory] = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dossier') 
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false)

  const [printDocData, setPrintDocData] = useState(null)

  const fetchEmployeeData = useCallback(async () => {
    try {
      const { data: empData, error: empError } = await supabase.from('employees').select('*').eq('id', id).single()
      if (empError) throw empError
      setEmployee(empData)

      const { data: compData } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
      if (compData) setCompanyInfo(compData)

      const { data: salesData } = await supabase.from('sales')
        .select('*')
        .eq('status', 'concluido')
        .order('created_at', { ascending: false })
        .limit(50) 
      setSalesHistory(salesData || [])

      const { data: occData } = await supabase.from('employee_occurrences')
        .select('*')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
      setOccurrences(occData || [])

    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar dados.")
      navigate('/equipe')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchEmployeeData()
  }, [fetchEmployeeData])

  // --- NOVA LÓGICA: ANONIMIZAÇÃO (LGPD) ---
  const handleTerminateEmployee = async () => {
    const confirmMessage = `ATENÇÃO: Ação Irreversível (LGPD)\n\nVocê está prestes a desligar ${employee.name}.\n\nPara cumprir a LGPD e manter a integridade fiscal:\n1. O acesso ao sistema será revogado IMEDIATAMENTE.\n2. Nome, Email e Telefone serão removidos (Anonimizados).\n3. O histórico de vendas será preservado.\n\nDeseja continuar?`

    if (!window.confirm(confirmMessage)) return

    const toastId = toast.loading("Anonimizando dados...")
    try {
      const { error } = await supabase.rpc('anonymize_employee_rpc', { 
        target_employee_id: employee.id 
      })

      if (error) throw error

      toast.success("Colaborador desligado e dados protegidos.", { id: toastId })
      navigate('/equipe')
    } catch (error) {
      console.error(error)
      toast.error("Erro ao processar desligamento.", { id: toastId })
    }
  }

  const handleSaveOccurrence = async (data) => {
    try {
        const { error } = await supabase.from('employee_occurrences').insert({
            employee_id: id,
            company_id: employee.company_id,
            type: data.type,
            date: data.date,
            description: data.description,
            location: data.location,
            severity: data.severity
        })
        if (error) throw error
        toast.success("Ocorrência registrada")
        setIsOccurrenceModalOpen(false)
        fetchEmployeeData()
    } catch (e) {
        console.error(e)
        toast.error("Erro ao salvar")
    }
  }

  const handleDeleteOccurrence = async (occId) => {
      if (!window.confirm("Excluir este registro permanentemente?")) return
      try {
          await supabase.from('employee_occurrences').delete().eq('id', occId)
          toast.success("Registro removido")
          fetchEmployeeData()
      } catch (error) { 
          console.error(error)
          toast.error("Erro ao excluir") 
      }
  }

  const handlePrintDocument = (occ) => {
      setPrintDocData(occ)
      setTimeout(() => window.print(), 500)
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>
  if (!employee) return null

  return (
    // AJUSTE MOBILE: padding lateral (px-4) e padding bottom (pb-24)
    <div className="max-w-5xl mx-auto pb-24 px-4 md:px-6 animate-fade-in">
      
      {/* IMPRESSÃO INVISÍVEL */}
      {printDocData && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
           <DisciplinaryDocument data={printDocData} employee={employee} company={companyInfo} />
        </div>
      )}

      {/* HEADER RESPONSIVO: Flex-col no mobile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 print:hidden">
        <button onClick={() => navigate('/equipe')} className="flex items-center text-slate-500 hover:text-blue-600 transition-colors self-start">
          <ArrowLeft size={20} className="mr-2"/> Voltar para Equipe
        </button>
        
        {/* BOTÃO DE DESLIGAMENTO LGPD */}
        {employee.status === 'Ativo' && (
            <button 
                onClick={handleTerminateEmployee} 
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all font-bold text-sm"
            >
                <UserX size={18} /> Desligar Colaborador (LGPD)
            </button>
        )}
      </div>

      {/* CARTÃO PRINCIPAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 mb-6 md:mb-8 print:hidden">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg text-slate-300 shrink-0">
            <User size={48} />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">{employee.name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{employee.role}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${employee.status === 'Ativo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {employee.status}
                    </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8 text-left">
              <InfoItem icon={<Mail size={18}/>} label="Email" value={employee.email} />
              <InfoItem icon={<Phone size={18}/>} label="Telefone" value={employee.phone || '-'} />
              <InfoItem icon={<Calendar size={18}/>} label="Data de Admissão" value={formatDateTime(employee.created_at)} />
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex gap-4 border-b border-slate-200 mb-6 md:mb-8 overflow-x-auto print:hidden">
        <button onClick={() => setActiveTab('dossier')} className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dossier' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Shield size={18}/> Dossiê Disciplinar
        </button>
        <button onClick={() => setActiveTab('sales')} className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <TrendingUp size={18}/> Histórico de Vendas
        </button>
      </div>

      {/* CONTEÚDO DAS TABS */}
      {activeTab === 'sales' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in print:hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {salesHistory.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-600">{formatDateTime(sale.created_at)}</td>
                                <td className="p-4 font-medium text-slate-800">{sale.customer_name}</td>
                                <td className="p-4 font-bold text-green-600">R$ {Number(sale.total).toFixed(2)}</td>
                                <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{sale.status}</span></td>
                            </tr>
                        ))}
                        {salesHistory.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhuma venda registrada.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in print:hidden">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
             <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText size={20}/> Ocorrências Registradas</h3>
             <button onClick={() => setIsOccurrenceModalOpen(true)} className="w-full md:w-auto bg-slate-900 text-white px-4 py-3 md:py-2 rounded-lg text-sm font-bold hover:bg-slate-800 flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg">
                <PlusCircle size={18}/> Nova Ocorrência
             </button>
          </div>

          <div className="grid gap-4">
            {occurrences.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 md:p-12 text-center text-slate-400">
                    <Shield size={48} className="mx-auto mb-3 opacity-20"/>
                    <p>Ficha limpa. Nenhuma ocorrência registrada.</p>
                </div>
            ) : (
              occurrences.map(occ => {
                const isSevere = ['suspensao', 'escrita'].includes(occ.type)
                const isPositive = occ.type === 'elogio'
                
                return (
                  <div key={occ.id} className={`bg-white p-4 md:p-6 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${isPositive ? 'border-l-green-500' : isSevere ? 'border-l-red-500' : 'border-l-amber-400'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded w-fit ${isPositive ? 'bg-green-100 text-green-700' : isSevere ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {occ.type}
                            </span>
                            <span className="text-slate-400 text-xs font-mono">{formatDateTime(occ.date)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handlePrintDocument(occ)}
                            className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Imprimir Documento"
                          >
                            <Printer size={18}/>
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteOccurrence(occ.id)}
                            className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Excluir Registro"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm mt-2 leading-relaxed">{occ.description}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      <NewOccurrenceModal 
        isOpen={isOccurrenceModalOpen}
        onClose={() => setIsOccurrenceModalOpen(false)}
        employeeName={employee.name}
        onSave={handleSaveOccurrence}
        companyConfig={companyInfo} 
      />

    </div>
  )
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 h-full">
      <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0"> {/* Garante que o texto quebre corretamente */}
        <p className="text-xs font-bold text-slate-400 uppercase mb-0.5">{label}</p>
        <p className="text-slate-800 font-medium break-words">{value}</p>
      </div>
    </div>
  )
}