import { useState, useEffect } from 'react'
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2, 
  ArrowLeft, 
  ClipboardList, 
  ArrowRightLeft, 
  Scale, 
  Filter, 
  X, 
  Printer, 
  FileSpreadsheet, 
  History, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Trash2, 
  XCircle, 
  ShieldAlert, 
  Search, 
  Eye 
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { toUTCStart, toUTCEnd, formatDateTime } from '../utils/dateUtils'
import { exportToCSV } from '../utils/excelUtils'
import { PrintPortal } from '../components/Receipts' 
import { FiscalService } from '../services/FiscalService'
import { AuthModal } from '../components/AuthModal'

export function Relatorios() {
  const [currentView, setCurrentView] = useState('menu') 

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {currentView === 'menu' && (
        <ReportsMenu onSelect={setCurrentView} />
      )}

      {currentView === 'movimentacoes' && (
        <MovementsReport onBack={() => setCurrentView('menu')} />
      )}

      {currentView === 'inventario' && (
        <InventoryAuditReport onBack={() => setCurrentView('menu')} />
      )}

      {currentView === 'historico_vendas' && (
        <SalesHistoryReport onBack={() => setCurrentView('menu')} />
      )}

      {currentView === 'auditoria_logs' && (
        <AuditLogsReport onBack={() => setCurrentView('menu')} />
      )}
    </div>
  )
}

function ReportsMenu({ onSelect }) {
  return (
    <div className="animate-fade-in no-print px-1">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Central de Relatórios</h2>
      <p className="text-sm text-slate-500 mb-6">Selecione o tipo de relatório que deseja visualizar.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <button 
          onClick={() => onSelect('historico_vendas')}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-violet-300 transition-all text-left group h-full flex flex-col active:scale-95 duration-100"
        >
          <div className="bg-violet-50 w-12 h-12 rounded-lg flex items-center justify-center text-violet-600 mb-4 group-hover:scale-110 transition-transform">
            <History size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Histórico de Vendas</h3>
          <p className="text-slate-500 text-sm flex-1">
            Visualize todas as vendas, status fiscal e reemita notas (NFC-e).
          </p>
        </button>

        <button 
          onClick={() => onSelect('movimentacoes')}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-300 transition-all text-left group h-full flex flex-col active:scale-95 duration-100"
        >
          <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <ArrowRightLeft size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Extrato de Movimentações</h3>
          <p className="text-slate-500 text-sm flex-1">
            Histórico completo de entradas e saídas de estoque. Filtre por data, tipo e motivo.
          </p>
        </button>

        <button 
          onClick={() => onSelect('inventario')}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-amber-300 transition-all text-left group h-full flex flex-col active:scale-95 duration-100"
        >
          <div className="bg-amber-50 w-12 h-12 rounded-lg flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
            <ClipboardList size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Auditoria de Inventário</h3>
          <p className="text-slate-500 text-sm flex-1">
            Histórico das contagens físicas (Balanços). Veja quem contou e as divergências.
          </p>
        </button>

        {/* NOVO CARD LGPD */}
        <button 
          onClick={() => onSelect('auditoria_logs')}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-400 transition-all text-left group h-full flex flex-col active:scale-95 duration-100"
        >
          <div className="bg-slate-100 w-12 h-12 rounded-lg flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform">
            <ShieldAlert size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Logs de Segurança</h3>
          <p className="text-slate-500 text-sm flex-1">
            Rastreabilidade LGPD. Veja quem alterou preços, cadastros e configurações críticas.
          </p>
        </button>

      </div>
    </div>
  )
}

// --- NOVO COMPONENTE: LOGS DE AUDITORIA (LGPD) ---
function AuditLogsReport({ onBack }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState({}) // Mapa de UUID -> Nome
    
    // Filtros
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        table: '',
        operation: ''
    })

    // Modal de Detalhes
    const [selectedLog, setSelectedLog] = useState(null)

    useEffect(() => {
        fetchLogs()
    }, [filters])

    async function fetchLogs() {
        setLoading(true)
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (filters.table) query = query.eq('table_name', filters.table)
            if (filters.operation) query = query.eq('operation', filters.operation)
            if (filters.startDate) query = query.gte('created_at', toUTCStart(filters.startDate))
            if (filters.endDate) query = query.lte('created_at', toUTCEnd(filters.endDate))

            const { data, error } = await query
            if (error) throw error

            setLogs(data || [])
            
            // Busca nomes dos usuários envolvidos
            if (data && data.length > 0) {
                const userIds = [...new Set(data.map(l => l.changed_by).filter(Boolean))]
                if (userIds.length > 0) {
                    const { data: users } = await supabase.from('employees').select('auth_user_id, name').in('auth_user_id', userIds)
                    const userMap = {}
                    users?.forEach(u => userMap[u.auth_user_id] = u.name)
                    setEmployees(userMap)
                }
            }

        } catch (error) {
            console.error(error)
            toast.error('Erro ao buscar logs')
        } finally {
            setLoading(false)
        }
    }

    const getDiff = (oldD, newD) => {
        if (!oldD && newD) return { type: 'create', data: newD }
        if (oldD && !newD) return { type: 'delete', data: oldD }
        
        // Compare changes
        const changes = {}
        const allKeys = [...new Set([...Object.keys(oldD || {}), ...Object.keys(newD || {})])]
        
        allKeys.forEach(key => {
            if (JSON.stringify(oldD[key]) !== JSON.stringify(newD[key])) {
                changes[key] = { from: oldD[key], to: newD[key] }
            }
        })
        return { type: 'update', changes }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                         <ShieldAlert className="text-slate-600"/> Logs de Auditoria
                    </h2>
                    <p className="text-sm text-slate-500">Rastreabilidade de alterações em dados sensíveis (LGPD).</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Tabela</label>
                    <select 
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.table}
                        onChange={e => setFilters({...filters, table: e.target.value})}
                    >
                        <option value="">Todas</option>
                        <option value="products">Produtos</option>
                        <option value="employees">Funcionários</option>
                        <option value="sales">Vendas</option>
                        <option value="company_settings">Dados Empresa</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Operação</label>
                    <select 
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.operation}
                        onChange={e => setFilters({...filters, operation: e.target.value})}
                    >
                        <option value="">Todas</option>
                        <option value="INSERT">Criação (INSERT)</option>
                        <option value="UPDATE">Alteração (UPDATE)</option>
                        <option value="DELETE">Exclusão (DELETE)</option>
                    </select>
                </div>
                <button onClick={fetchLogs} className="self-end px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors h-[38px] mt-auto w-full md:w-auto">
                    <Search size={16} className="inline mr-2"/> Filtrar
                </button>
            </div>

            {/* Tabela com Scroll Horizontal */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4">Data/Hora</th>
                            <th className="p-4">Usuário</th>
                            <th className="p-4">Tabela</th>
                            <th className="p-4 text-center">Ação</th>
                            <th className="p-4 text-right">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center"><Loader2 className="animate-spin inline text-slate-400"/></td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-sm text-slate-600 font-mono">{formatDateTime(log.created_at)}</td>
                                    <td className="p-4 text-sm font-medium text-slate-700">
                                        {employees[log.changed_by] || 'Sistema / Desconhecido'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 font-mono text-xs">{log.table_name}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            log.operation === 'INSERT' ? 'bg-green-100 text-green-700' :
                                            log.operation === 'DELETE' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {log.operation}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setSelectedLog(log)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Eye size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Detalhes (Visualizador de Diff) */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Detalhes da Alteração</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="mb-4 text-sm text-slate-500">
                                <p><strong>ID do Registro:</strong> {selectedLog.record_id}</p>
                                <p><strong>Tabela:</strong> {selectedLog.table_name}</p>
                            </div>
                            
                            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                                {(() => {
                                    const diff = getDiff(selectedLog.old_data, selectedLog.new_data)
                                    
                                    if (diff.type === 'create') {
                                        return (
                                            <div>
                                                <div className="text-green-400 font-bold mb-2">// NOVO REGISTRO</div>
                                                {Object.entries(diff.data).map(([k, v]) => (
                                                    <div key={k} className="text-slate-300">
                                                        <span className="text-purple-400">{k}:</span> {JSON.stringify(v)}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }
                                    if (diff.type === 'delete') {
                                        return (
                                            <div>
                                                <div className="text-red-400 font-bold mb-2">// REGISTRO EXCLUÍDO</div>
                                                {Object.entries(diff.data).map(([k, v]) => (
                                                    <div key={k} className="text-slate-500 line-through">
                                                        <span className="text-purple-400">{k}:</span> {JSON.stringify(v)}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }
                                    // Update
                                    return (
                                        <div>
                                            <div className="text-blue-400 font-bold mb-2">// CAMPOS ALTERADOS</div>
                                            {Object.entries(diff.changes).map(([k, val]) => (
                                                <div key={k} className="mb-1 border-b border-slate-700 pb-1">
                                                    <span className="text-purple-400 font-bold">{k}</span>
                                                    <div className="flex gap-2 items-center mt-1">
                                                        <span className="text-red-400 bg-red-900/20 px-1 rounded line-through opacity-70">{JSON.stringify(val.from)}</span>
                                                        <span className="text-slate-500">➜</span>
                                                        <span className="text-green-400 bg-green-900/20 px-1 rounded font-bold">{JSON.stringify(val.to)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {Object.keys(diff.changes).length === 0 && <span className="text-slate-500">Nenhuma alteração detectada nos dados (apenas metadados).</span>}
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function SalesHistoryReport({ onBack }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  
  // Controle de Auth
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [saleToCancel, setSaleToCancel] = useState(null)

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)
    try {
      // Pega as últimas 50 vendas
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setSales(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao buscar vendas.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmitFiscal = async (sale) => {
    if (!confirm('Deseja emitir/reemitir a nota fiscal desta venda?')) return
    
    setProcessingId(sale.id)
    const toastId = toast.loading('Emitindo Nota Fiscal...')
    
    try {
      const result = await FiscalService.emitirNFCe(sale.id)
      if (result.success) {
        toast.success('Nota autorizada!', { id: toastId })
        fetchSales() // Recarrega a lista
      } else {
        toast.error(`Erro: ${result.error}`, { id: toastId })
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao comunicar com serviço fiscal', { id: toastId })
    } finally {
      setProcessingId(null)
    }
  }

  // Início do Cancelamento (Pede senha)
  const initiateCancel = (sale) => {
    setSaleToCancel(sale)
    setAuthModalOpen(true)
  }

  // Execução do Cancelamento (Após senha)
  const executeCancel = async (approver) => {
    if (!saleToCancel) return
    const toastId = toast.loading("Cancelando venda e estornando estoque...")
    
    try {
      // 1. Marca venda como cancelada
      await supabase.from('sales').update({ 
          status: 'cancelado',
          fiscal_message: `Cancelado por ${approver.name.split(' ')[0]}`
      }).eq('id', saleToCancel.id)

      // 2. Busca itens para devolver ao estoque
      const { data: items } = await supabase.from('sale_items').select('*, product:products(*)').eq('sale_id', saleToCancel.id)
      
      // 3. Devolve estoque
      if (items) {
          for (const item of items) {
              if (item.product && item.product.track_stock) {
                  const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product.id).single()
                  if (prod) {
                      await supabase.from('products').update({ stock_quantity: prod.stock_quantity + item.quantity }).eq('id', item.product.id)
                  }
              }
          }
      }

      toast.success("Venda estornada com sucesso!", { id: toastId })
      fetchSales()

    } catch (error) {
      console.error(error)
      toast.error("Erro ao cancelar venda", { id: toastId })
    } finally {
      setSaleToCancel(null)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* MODAL DE SEGURANÇA */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => { setAuthModalOpen(false); setSaleToCancel(null) }} 
        onSuccess={executeCancel}
        title="Autorizar Estorno"
        message={`Confirmar cancelamento da Venda #${saleToCancel?.id}? Isso devolverá os itens ao estoque.`}
      />

      <div className="flex items-center gap-4 no-print">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Histórico de Vendas & Fiscal</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Data/Hora</th>
              <th className="px-6 py-4">ID Venda</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 text-center">Status Fiscal</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan="6" className="p-10 text-center"><Loader2 className="animate-spin inline text-slate-400"/></td></tr>
            ) : sales.length === 0 ? (
               <tr><td colSpan="6" className="p-10 text-center text-slate-400">Nenhuma venda encontrada.</td></tr>
            ) : (
              sales.map(sale => (
                <tr key={sale.id} className={`transition-colors ${sale.status === 'cancelado' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(sale.created_at)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">#{String(sale.id).slice(0,8)}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{sale.customer_name || 'Varejo'}</td>
                  <td className={`px-6 py-4 text-right font-bold ${sale.status === 'cancelado' ? 'text-red-400 line-through' : 'text-slate-800'}`}>R$ {sale.total.toFixed(2)}</td>
                  
                  <td className="px-6 py-4 text-center">
                    {sale.status === 'cancelado' ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold"><XCircle size={12}/> Cancelada</span> :
                     sale.fiscal_status === 'autorizado' ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold"><CheckCircle size={12}/> Autorizada</span> :
                     sale.fiscal_status === 'erro' ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold"><AlertTriangle size={12}/> Erro Fiscal</span> :
                     <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">Pendente</span>
                    }
                  </td>

                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {/* Botão Ver DANFE (Se autorizado e não cancelado) */}
                    {sale.status !== 'cancelado' && sale.fiscal_status === 'autorizado' && (sale.pdf_url || sale.fiscal_pdf) && (
                      <a href={sale.pdf_url || sale.fiscal_pdf} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Ver DANFE">
                        <FileText size={18} />
                      </a>
                    )}

                    {/* Botão Emitir (Se pendente ou erro e não cancelado) */}
                    {sale.status !== 'cancelado' && sale.fiscal_status !== 'autorizado' && (
                      <button 
                        onClick={() => handleEmitFiscal(sale)}
                        disabled={processingId === sale.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-900 disabled:opacity-50"
                      >
                        {processingId === sale.id ? <Loader2 size={12} className="animate-spin"/> : <Printer size={12}/>}
                        Emitir
                      </button>
                    )}

                    {/* Botão Cancelar (Protegido) - Só se não estiver cancelado */}
                    {sale.status !== 'cancelado' && (
                        <button onClick={() => initiateCancel(sale)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Estornar Venda">
                            <Trash2 size={18}/>
                        </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MovementsReport({ onBack }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [isPrinting, setIsPrinting] = useState(false)

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    reason: '',
    employeeId: ''
  })

  const reasonOptions = [
    { value: 'compra', label: 'Compra' },
    { value: 'venda', label: 'Venda' },
    { value: 'producao', label: 'Produção' },
    { value: 'perda', label: 'Perda' },
    { value: 'uso_interno', label: 'Uso Interno' },
    { value: 'balanco', label: 'Balanço' },
    { value: 'ajuste_sobra', label: 'Ajuste (Sobra)' },
    { value: 'ajuste_falta', label: 'Ajuste (Falta)' },
  ]

  const formatReason = (reason) => {
    const found = reasonOptions.find(r => r.value === reason)
    return found ? found.label : reason
  }

  useEffect(() => {
    async function getEmployees() {
      const { data } = await supabase.from('employees').select('id, name').order('name')
      setEmployees(data || [])
    }
    getEmployees()
  }, [])

  useEffect(() => {
    async function fetchMovements() {
      setLoading(true)
      try {
        let query = supabase
          .from('stock_movements')
          .select(`
            *, 
            product: products (name, unit), 
            employee: employees!employee_id (name)
          `)
          .order('created_at', { ascending: false })

        if (filters.type) query = query.eq('type', filters.type)
        if (filters.reason) query = query.eq('reason', filters.reason)
        if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)

        if (filters.startDate) query = query.gte('created_at', toUTCStart(filters.startDate))
        if (filters.endDate) query = query.lte('created_at', toUTCEnd(filters.endDate))

        if (!filters.startDate && !filters.endDate) query = query.limit(100)
        else query = query.limit(1000)

        const { data, error } = await query
        if (error) throw error
        setMovements(data || [])
      } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    fetchMovements()
  }, [filters])

  const handleExport = () => {
    const dataToExport = movements.map(m => ({
      date: formatDateTime(m.created_at),
      product: m.product?.name,
      type: m.type,
      reason: formatReason(m.reason),
      quantity: m.quantity,
      unit: m.product?.unit,
      employee: m.employee?.name
    }))

    exportToCSV(dataToExport, 'extrato_movimentacoes', {
      date: 'Data',
      product: 'Produto',
      type: 'Tipo',
      reason: 'Motivo',
      quantity: 'Qtd',
      unit: 'Un',
      employee: 'Responsável'
    })
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
        window.print()
        setIsPrinting(false)
    }, 200)
  }

  const ReportContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto print:shadow-none print:border-none print:w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
            <th className="px-6 py-4 border-b">Data</th>
            <th className="px-6 py-4 border-b">Produto</th>
            <th className="px-6 py-4 border-b">Tipo</th>
            <th className="px-6 py-4 border-b">Motivo</th>
            <th className="px-6 py-4 text-right border-b">Qtd.</th>
            <th className="px-6 py-4 text-right border-b">Resp.</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {movements.length === 0 ? (
            <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">Nada encontrado.</td></tr>
            ) : (
            movements.map(mov => (
                <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-500 border-b">{formatDateTime(mov.created_at)}</td>
                <td className="px-6 py-4 font-medium text-slate-800 border-b">{mov.product?.name}</td>
                <td className="px-6 py-4 border-b">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold uppercase ${mov.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {mov.type === 'entrada' ? 'ENT' : 'SAI'}
                    </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 border-b">{formatReason(mov.reason)}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700 border-b">
                    {mov.quantity} <span className="text-xs font-normal text-slate-400">{mov.product?.unit}</span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-slate-500 border-b">{mov.employee?.name || '-'}</td>
                </tr>
            ))
            )}
        </tbody>
        </table>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-6">
      
      {isPrinting && (
        <PrintPortal>
            <div className="print-a4-landscape">
                <div className="print-header-a4 mb-6 text-center border-b pb-4">
                    <h1 className="text-2xl font-bold">Relatório: Extrato de Movimentações</h1>
                    <p className="text-sm">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                </div>
                <ReportContent />
            </div>
        </PrintPortal>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-800">Extrato de Movimentações</h2>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
             <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
           </button>
           <button onClick={handleExport} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-green-700 bg-white border border-green-200 rounded-lg hover:bg-green-50">
             <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
           </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 no-print">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">De:</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.startDate} onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Até:</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.endDate} onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo:</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.type} onChange={e => setFilters(prev => ({...prev, type: e.target.value}))}>
              <option value="">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Motivo:</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.reason} onChange={e => setFilters(prev => ({...prev, reason: e.target.value}))}>
              <option value="">Todos</option>
              {reasonOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Responsável:</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.employeeId} onChange={e => setFilters(prev => ({...prev, employeeId: e.target.value}))}>
              <option value="">Todos</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <ReportContent />
      )}
    </div>
  )
}

function InventoryAuditReport({ onBack }) {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false)
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        let query = supabase
          .from('stock_movements')
          .select(`
            *, 
            product: products (name, unit), 
            counter: employees!employee_id (name),
            approver: employees!approved_by (name)
          `)
          .eq('reason', 'balanco') 
          .order('created_at', { ascending: false })

        if (filters.startDate) query = query.gte('created_at', toUTCStart(filters.startDate))
        if (filters.endDate) query = query.lte('created_at', toUTCEnd(filters.endDate))

        if (!filters.startDate && !filters.endDate) query = query.limit(100)
        else query = query.limit(1000)

        const { data, error } = await query
        if (error) throw error
        setAudits(data || [])
      } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar auditorias.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filters])

  const handleExport = () => {
    const dataToExport = audits.map(a => ({
      date: formatDateTime(a.created_at),
      product: a.product?.name,
      oldStock: a.old_stock,
      newStock: a.new_stock,
      diff: Number(a.new_stock) - Number(a.old_stock),
      unit: a.product?.unit,
      counter: a.counter?.name,
      approver: a.approver?.name
    }))

    exportToCSV(dataToExport, 'auditoria_inventario', {
      date: 'Data', product: 'Produto', oldStock: 'Sistema', newStock: 'Real', diff: 'Diferença', unit: 'Un', counter: 'Contagem', approver: 'Aprovação'
    })
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
        window.print()
        setIsPrinting(false)
    }, 200)
  }

  const ReportContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto print:shadow-none print:border-none print:w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
            <th className="px-6 py-4 border-b">Data Aprov.</th>
            <th className="px-6 py-4 border-b">Produto</th>
            <th className="px-6 py-4 text-center border-b">Virtual</th>
            <th className="px-6 py-4 text-center border-b">Real</th>
            <th className="px-6 py-4 text-center border-b">Dif.</th>
            <th className="px-6 py-4 text-right border-b">Resp.</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {audits.map(audit => {
            const oldS = Number(audit.old_stock)
            const newS = Number(audit.new_stock)
            const diff = newS - oldS 

            return (
                <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-500 border-b">{formatDateTime(audit.created_at)}</td>
                <td className="px-6 py-4 font-medium text-slate-800 border-b">{audit.product?.name}</td>
                <td className="px-6 py-4 text-center text-slate-500 font-mono border-b">{oldS.toFixed(3)}</td>
                <td className="px-6 py-4 text-center font-bold text-slate-800 font-mono bg-blue-50/30 border-b">{newS.toFixed(3)}</td>
                <td className="px-6 py-4 text-center font-mono border-b">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                    </span>
                </td>
                <td className="px-6 py-4 text-right text-xs text-slate-500 border-b">
                    <div><b>C:</b> {audit.counter?.name || 'N/A'}</div>
                    <div><b>A:</b> {audit.approver?.name || 'N/A'}</div>
                </td>
                </tr>
            )
            })}
        </tbody>
        </table>
        
        {audits.length === 0 && (
        <div className="p-10 text-center text-slate-400 italic">
            Nenhum balanço aprovado encontrado.
        </div>
        )}
    </div>
  )

  return (
    <div className="animate-fade-in space-y-6">
      
      {isPrinting && (
        <PrintPortal>
            <div className="print-a4-landscape">
                <div className="print-header-a4 mb-6 text-center border-b pb-4">
                    <h1 className="text-2xl font-bold">Relatório: Auditoria de Inventário</h1>
                    <p className="text-sm">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                </div>
                <ReportContent />
            </div>
        </PrintPortal>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Conferência de Inventário</h2>
            <p className="text-xs text-slate-500">Histórico de balanços aprovados.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
             <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
           </button>
           <button onClick={handleExport} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-green-700 bg-white border border-green-200 rounded-lg hover:bg-green-50">
             <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
           </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">De:</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.startDate} onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Até:</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={filters.endDate} onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))}/>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <ReportContent />
      )}
    </div>
  )
}