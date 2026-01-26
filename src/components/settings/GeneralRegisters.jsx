import { useState, useEffect, useCallback } from 'react'
import { 
  Layers, 
  Package, 
  PieChart, 
  Scale, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

// 1. Configuração movida para fora para ser estável (evita loop de renderização)
const TABS_CONFIG = {
  pdv: {
    label: 'Categorias PDV',
    icon: Layers,
    table: 'categories',
    placeholder: 'Ex: Bebidas, Lanches...',
    hasSymbol: false
  },
  stock: {
    label: 'Categorias Estoque',
    icon: Package,
    table: 'stock_categories_list',
    placeholder: 'Ex: Mercearia, Carnes, Limpeza...',
    hasSymbol: false
  },
  financial: {
    label: 'Grupos Financeiros',
    icon: PieChart,
    table: 'financial_groups_list',
    placeholder: 'Ex: Receita Operacional, Custo Variável...',
    hasSymbol: false
  },
  units: {
    label: 'Unidades de Medida',
    icon: Scale,
    table: 'units_list',
    placeholder: 'Ex: Quilograma, Litro...',
    hasSymbol: true
  }
}

export function GeneralRegisters() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('pdv') // pdv | stock | financial | units
  const [loading, setLoading] = useState(true)
  
  // Listas de Dados
  const [listData, setListData] = useState([])
  
  // Form de Cadastro
  const [newName, setNewName] = useState('')
  const [newSymbol, setNewSymbol] = useState('') 
  const [isSaving, setIsSaving] = useState(false)

  const currentConfig = TABS_CONFIG[activeTab]

  // 2. fetchData envolvida em useCallback para estabilidade
  const fetchData = useCallback(async () => {
    if (!user?.company_id) return
    
    // Usa a configuração baseada na aba ativa no momento da execução
    const config = TABS_CONFIG[activeTab]
    
    setLoading(true)
    try {
      const query = supabase
        .from(config.table)
        .select('*')
        .eq('company_id', user.company_id)
        
      query.order('name')

      const { data, error } = await query
      if (error) throw error
      setListData(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [user?.company_id, activeTab]) // Dependências corretas

  // 3. useEffect agora tem a dependência correta
  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    if (currentConfig.hasSymbol && !newSymbol.trim()) return toast.error("Símbolo é obrigatório")

    setIsSaving(true)
    try {
      const payload = {
        name: newName.trim(),
        company_id: user.company_id
      }

      if (currentConfig.hasSymbol) {
        payload.symbol = newSymbol.trim() 
      }

      const { data, error } = await supabase
        .from(currentConfig.table)
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      setListData([...listData, data])
      setNewName('')
      setNewSymbol('')
      toast.success('Item adicionado com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao adicionar. Verifique se já existe.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza? Se este item estiver em uso, a exclusão será bloqueada.')) return

    try {
      const { error } = await supabase
        .from(currentConfig.table)
        .delete()
        .eq('id', id)

      if (error) throw error

      setListData(listData.filter(item => item.id !== id))
      toast.success('Item excluído!')
    } catch (error) {
      console.error(error)
      if (error.code === '23503') {
        toast.error('Não é possível excluir: Item está em uso em produtos ou registros.')
      } else {
        toast.error('Erro ao excluir item.')
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cadastros Gerais</h2>
          <p className="text-sm text-slate-500">Gerencie categorias, grupos e unidades do sistema.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* ABAS */}
        <div className="flex overflow-x-auto border-b border-slate-200">
          {Object.entries(TABS_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setNewName(''); setNewSymbol('') }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                  isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {config.label}
              </button>
            )
          })}
        </div>

        <div className="p-6">
            {/* FORMULÁRIO DE ADIÇÃO */}
            <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {activeTab === 'units' ? 'Nome da Unidade' : `Nome da ${currentConfig.label.split(' ')[0]}`}
                    </label>
                    <input 
                        type="text" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder={currentConfig.placeholder}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Campo Extra para Símbolo (Apenas Unidades) */}
                {currentConfig.hasSymbol && (
                    <div className="w-full md:w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Símbolo</label>
                        <input 
                            type="text" 
                            value={newSymbol}
                            onChange={e => setNewSymbol(e.target.value)}
                            placeholder="kg, un, lt"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            maxLength={5}
                        />
                    </div>
                )}

                <div className="flex items-end">
                    <button 
                        type="submit" 
                        disabled={isSaving || !newName.trim()}
                        className="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
                        <span className="hidden md:inline">Adicionar</span>
                    </button>
                </div>
            </form>

            {/* LISTA DE DADOS */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                </div>
            ) : listData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                    <currentConfig.icon size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhum item cadastrado nesta lista.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {listData.map(item => (
                        <div key={item.id} className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    <currentConfig.icon size={16} />
                                </div>
                                <div className="truncate">
                                    <p className="font-bold text-slate-700 truncate">{item.name}</p>
                                    {item.symbol && (
                                        <p className="text-xs text-slate-400 font-mono">Símbolo: {item.symbol}</p>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Excluir"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Alerta de Segurança */}
            <div className="mt-8 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0"/>
                <p>
                    <strong>Atenção:</strong> A exclusão é definitiva. Se um item estiver sendo usado em algum produto ou venda, o sistema bloqueará a exclusão para manter a segurança dos seus dados.
                </p>
            </div>

        </div>
      </div>
    </div>
  )
}