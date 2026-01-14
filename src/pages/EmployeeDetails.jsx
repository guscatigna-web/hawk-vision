import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, Calendar, Loader2, History, FileText, AlertCircle, PlusCircle, TrendingUp, Shield, Printer, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../utils/dateUtils'
import { NewOccurrenceModal } from '../components/NewOccurrenceModal'
import { PrintPortal } from '../components/Receipts' 
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

      const { data: compData } = await supabase.from('company_settings').select('*').single()
      setCompanyInfo(compData || { trade_name: 'Empresa Modelo', city: 'Belo Horizonte' })

      const { data: salesData } = await supabase.from('sales').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(50)
      setSalesHistory(salesData || [])

      const { data: occData } = await supabase.from('employee_occurrences').select('*').eq('employee_id', id).order('date', { ascending: false })
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

  // --- LÓGICA DE IMPRESSÃO ---
  const handlePrintDoc = (occurrence) => {
    setPrintDocData(occurrence)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrintDocData(null), 1000) 
    }, 500)
  }

  // --- LÓGICA DE EXCLUSÃO (NOVO) ---
  const handleDeleteOccurrence = async (occurrenceId) => {
    if (!confirm("Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita.")) return

    try {
      const { error } = await supabase
        .from('employee_occurrences')
        .delete()
        .eq('id', occurrenceId)

      if (error) throw error

      toast.success("Registro excluído.")
      fetchEmployeeData() // Atualiza a lista
    } catch (error) {
      console.error(error)
      toast.error("Erro ao excluir.")
    }
  }

  const handleSaveOccurrence = async (payload) => {
    try {
      const { data, error } = await supabase.from('employee_occurrences').insert({
        employee_id: id,
        type: payload.type,
        description: payload.description,
        date: payload.date,
        severity: payload.severity,
        location: payload.location
      }).select().single()

      if (error) throw error
      
      toast.success("Ocorrência registrada!")
      await fetchEmployeeData() 

      if (payload.type === 'escrita' || payload.type === 'suspensao') {
        toast('Preparando documento para impressão...', { icon: '🖨️' })
        handlePrintDoc(data)
      }

    } catch (error) {
      console.error(error)
      toast.error("Erro ao salvar ocorrência.")
    }
  }

  const getSeverityBadge = (severity, type) => {
    const config = {
      positive: { bg: 'bg-green-100', text: 'text-green-700', icon: <div className="w-2 h-2 rounded-full bg-green-500"/> },
      low: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <div className="w-2 h-2 rounded-full bg-blue-400"/> },
      medium: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <div className="w-2 h-2 rounded-full bg-orange-500"/> },
      high: { bg: 'bg-red-50', text: 'text-red-700', icon: <div className="w-2 h-2 rounded-full bg-red-600"/> },
    }
    const style = config[severity] || config.low
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase flex items-center gap-2 ${style.bg} ${style.text}`}>
        {style.icon} {type}
      </span>
    )
  }

  const formatAdmissionDate = (dateString) => {
    if (!dateString) return '-'
    const [y, m, d] = dateString.split('-')
    return `${d}/${m}/${y}`
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>
  if (!employee) return null

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {printDocData && (
        <PrintPortal>
          <DisciplinaryDocument 
            data={printDocData} 
            employee={employee} 
            company={companyInfo} 
          />
        </PrintPortal>
      )}

      {/* HEADER */}
      <div className="flex items-center gap-4 no-print">
        <button onClick={() => navigate('/equipe')} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{employee.name}</h2>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            {employee.role} 
            {employee.role === 'Gerente' && <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-100">PIN ATIVO</span>}
          </p>
        </div>
      </div>

      {/* INFO CARD */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 no-print">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3 text-3xl shadow-inner">
              {employee.avatar || '👤'}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${employee.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {employee.status}
            </span>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <InfoItem icon={<Mail size={16}/>} label="Email / Login" value={employee.email || '-'} />
            <InfoItem icon={<Phone size={16}/>} label="Telefone" value={employee.phone || '-'} />
            <InfoItem icon={<Calendar size={16}/>} label="Admissão" value={formatAdmissionDate(employee.admission_date)} />
            <InfoItem icon={<Shield size={16}/>} label="Nível de Acesso" value={employee.role} />
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex gap-2 border-b border-slate-200 no-print">
        <button 
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp size={18}/> Desempenho
        </button>
        <button 
          onClick={() => setActiveTab('dossier')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'dossier' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FileText size={18}/> Dossiê & Ocorrências
        </button>
      </div>

      {/* ABA: VENDAS */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in no-print">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18}/> Últimas Vendas</h3>
            <span className="text-xs text-slate-400">Últimas 50</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr><th className="px-6 py-3">Data</th><th className="px-6 py-3">Cliente</th><th className="px-6 py-3">Pagamento</th><th className="px-6 py-3 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesHistory.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhuma venda.</td></tr>
              ) : (
                salesHistory.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-500">{formatDateTime(sale.created_at)}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{sale.customer_name || 'Varejo'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 capitalize">{sale.payment_method}</td>
                    <td className="px-6 py-3 text-sm text-right font-bold text-green-600">R$ {sale.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA: DOSSIÊ (RH) */}
      {activeTab === 'dossier' && (
        <div className="space-y-4 animate-fade-in no-print">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><AlertCircle size={18}/> Histórico Disciplinar</h3>
            <button 
              onClick={() => setIsOccurrenceModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <PlusCircle size={16}/> Nova Ocorrência
            </button>
          </div>

          <div className="space-y-3">
            {occurrences.length === 0 ? (
              <div className="bg-white p-10 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                <FileText size={40} className="mx-auto mb-2 opacity-20"/>
                <p>Prontuário limpo.</p>
              </div>
            ) : (
              occurrences.map(occ => {
                const isPrintable = occ.type === 'escrita' || occ.type === 'suspensao';
                
                // DATA CORRIGIDA (SEM FUSO)
                const [y, m, d] = occ.date.split('-');
                const occDate = new Date(y, m - 1, d); 

                return (
                  <div key={occ.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition-shadow group relative">
                    <div className="flex flex-col items-center min-w-[80px] border-r border-slate-100 pr-4">
                      <span className="text-2xl font-bold text-slate-700">{occDate.getDate()}</span>
                      <span className="text-xs uppercase font-bold text-slate-400">
                        {occDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-xs text-slate-300">{occDate.getFullYear()}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(occ.severity, occ.type)}
                          <span className="text-xs text-slate-400 border-l border-slate-200 pl-2 ml-1">{occ.location || 'Local não informado'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isPrintable && (
                            <button 
                              onClick={() => handlePrintDoc(occ)}
                              className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Reimprimir Documento"
                            >
                              <Printer size={18}/>
                            </button>
                          )}
                          
                          {/* BOTÃO DE EXCLUSÃO */}
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
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
    </div>
  )
}