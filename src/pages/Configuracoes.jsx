import { useState, useEffect, useCallback } from 'react'
import { Save, Building2, FileText, Loader2, MapPin, Printer, Monitor, ChevronRight, ArrowLeft, Package, Trash2, Plus, Pencil, X, AlertTriangle, CreditCard, DollarSign, Percent, Lock, Server, Tag, MessageSquare, CloudLightning, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function Configuracoes() {
  const [currentView, setCurrentView] = useState('menu')

  return (
    <div className="space-y-6 animate-fade-in">
      
      {currentView === 'menu' && (
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Configurações</h2>
          <p className="text-sm text-slate-500">Gerencie os dados da empresa, estoque, financeiro, delivery e sistema.</p>
        </div>
      )}

      {currentView === 'menu' && <SettingsMenu onSelect={setCurrentView} />}
      
      {currentView === 'empresa' && <CompanySettings onBack={() => setCurrentView('menu')} />}
      {currentView === 'integracoes' && <IntegrationsSettings onBack={() => setCurrentView('menu')} />}
      {currentView === 'fiscal_emissao' && <FiscalConfig onBack={() => setCurrentView('menu')} />}
      {currentView === 'impressao' && <PrinterSettings onBack={() => setCurrentView('menu')} />}
      {currentView === 'estoque' && <StockSettings onBack={() => setCurrentView('menu')} />}
      {currentView === 'financeiro' && <FinancialSettings onBack={() => setCurrentView('menu')} />}

    </div>
  )
}

function SettingsMenu({ onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      
      <MenuCard 
        icon={<Building2 size={24}/>} 
        bg="bg-blue-50" color="text-blue-600"
        title="Dados da Empresa" 
        desc="CNPJ, IE, Endereço e Dados Fiscais."
        onClick={() => onSelect('empresa')}
      />

      <MenuCard 
        icon={<CloudLightning size={24}/>} 
        bg="bg-red-50" color="text-red-600"
        title="iFood & Delivery" 
        desc="Conexão, chaves de API e Aceite Automático."
        onClick={() => onSelect('integracoes')}
      />

      <MenuCard 
        icon={<FileText size={24}/>} 
        bg="bg-indigo-50" color="text-indigo-600"
        title="Emissão Fiscal" 
        desc="CSC, Token e Ambiente (NFC-e)."
        onClick={() => onSelect('fiscal_emissao')}
      />

      <MenuCard 
        icon={<Printer size={24}/>} 
        bg="bg-amber-50" color="text-amber-600"
        title="Impressão e KDS" 
        desc="Fluxo de produção e impressoras."
        onClick={() => onSelect('impressao')}
      />

      <MenuCard 
        icon={<Package size={24}/>} 
        bg="bg-green-50" color="text-green-600"
        title="Cadastros de Estoque" 
        desc="Categorias, Grupos e Unidades."
        onClick={() => onSelect('estoque')}
      />

      <MenuCard 
        icon={<DollarSign size={24}/>} 
        bg="bg-emerald-50" color="text-emerald-600"
        title="Financeiro" 
        desc="Taxas e Formas de Pagamento."
        onClick={() => onSelect('financeiro')}
      />

    </div>
  )
}

function MenuCard({ icon, bg, color, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group relative overflow-hidden h-full flex flex-col">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${bg} ${color}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm mb-4 flex-1">{desc}</p>
      <div className={`flex items-center text-sm font-bold ${color} mt-auto`}>
        Configurar <ChevronRight size={16} className="ml-1" />
      </div>
    </button>
  )
}

// --- INTEGRAÇÕES (ATUALIZADO COM AUTO_PRINT) ---
function IntegrationsSettings({ onBack }) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState({
      id: null,
      merchant_id: '',
      client_id: '',
      client_secret: '',
      auto_accept: false,
      auto_print: true, // Campo novo
      status: 'Inativo'
    })
  
    useEffect(() => {
      async function fetchConfig() {
        try {
          const { data, error } = await supabase.from('integrations_ifood').select('*').limit(1).single()
          // Ignora erro se for apenas "row not found"
          if (error && error.code !== 'PGRST116') throw error
          if (data) setConfig(data)
        } catch (error) { 
            console.log('Configuração não encontrada (será criada ao salvar). Detalhe:', error)
        } finally { 
            setLoading(false) 
        }
      }
      fetchConfig()
    }, [])
  
    async function handleSave(e) {
      e.preventDefault()
      setSaving(true)
      try {
        const { error } = await supabase.from('integrations_ifood').upsert({
          id: config.id, 
          merchant_id: config.merchant_id,
          client_id: config.client_id,
          client_secret: config.client_secret,
          auto_accept: config.auto_accept,
          auto_print: config.auto_print,
          status: config.merchant_id ? 'Ativo' : 'Inativo',
          updated_at: new Date()
        })
  
        if (error) throw error
        toast.success('Configuração de integração salva!')
      } catch (error) {
        console.error(error)
        toast.error('Erro ao salvar configuração')
      } finally {
        setSaving(false)
      }
    }

    const toggleAutoAccept = () => setConfig(prev => ({ ...prev, auto_accept: !prev.auto_accept }))
    const toggleAutoPrint = () => setConfig(prev => ({ ...prev, auto_print: !prev.auto_print }))
  
    if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600"/></div>
  
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><ArrowLeft size={24} /></button>
          <div><h2 className="text-xl font-bold text-slate-800">Integração iFood</h2><p className="text-sm text-slate-500">Gerencie a conexão e comportamento dos pedidos delivery.</p></div>
        </div>
  
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
             
             {/* TOGGLE 1: ACEITE AUTOMÁTICO */}
             <div className="flex items-center justify-between pb-6 border-b border-slate-50">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${config.auto_accept ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {config.auto_accept ? <CheckCircle2 size={24} /> : <MessageSquare size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Aceite Automático (KDS)</h3>
                        <p className="text-sm text-slate-500 max-w-md mt-1">
                            {config.auto_accept 
                                ? "LIGADO: Pedidos vão direto para a tela da Cozinha (Em Preparo)."
                                : "DESLIGADO: Pedidos aguardam aprovação manual do Gerente."
                            }
                        </p>
                    </div>
                </div>
                <button type="button" onClick={toggleAutoAccept} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config.auto_accept ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${config.auto_accept ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
             </div>

             {/* TOGGLE 2: IMPRESSÃO AUTOMÁTICA */}
             <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${config.auto_print ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Printer size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Imprimir Via de Expedição</h3>
                        <p className="text-sm text-slate-500 max-w-md mt-1">
                            Gera automaticamente a comanda física para conferência e grampo na sacola, mesmo usando KDS.
                        </p>
                    </div>
                </div>
                <button type="button" onClick={toggleAutoPrint} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config.auto_print ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${config.auto_print ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
             </div>

          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-50 pb-2">
              <CloudLightning className="mr-2 text-red-600" size={20} /> Credenciais da API (Sandbox/Produção)
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="label">Merchant ID (ID da Loja)</label>
                <input 
                  className="input-base font-mono" 
                  placeholder="Ex: 3540132" 
                  value={config.merchant_id || ''} 
                  onChange={e => setConfig({...config, merchant_id: e.target.value})}
                />
                <p className="text-[10px] text-slate-400 mt-1">Este ID identifica sua loja dentro do iFood.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">Client ID</label>
                    <input 
                        className="input-base font-mono text-xs" 
                        placeholder="Client ID do Portal do Desenvolvedor" 
                        value={config.client_id || ''} 
                        onChange={e => setConfig({...config, client_id: e.target.value})}
                        type="password"
                    />
                </div>
                <div>
                    <label className="label">Client Secret</label>
                    <input 
                        className="input-base font-mono text-xs" 
                        placeholder="Client Secret do Portal do Desenvolvedor" 
                        value={config.client_secret || ''} 
                        onChange={e => setConfig({...config, client_secret: e.target.value})}
                        type="password"
                    />
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 items-start mt-2">
                 <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0"/>
                 <p className="text-xs text-amber-800">
                    O iFood não fornece dados reais em Sandbox sem homologação. Enquanto aguarda, use o botão "Simular iFood" na tela principal para testar o fluxo com as configurações acima.
                 </p>
              </div>
            </div>
          </div>
  
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold flex items-center shadow-lg transition-all">
              {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Salvar Integração
            </button>
          </div>
        </form>
      </div>
    )
  }

function FiscalConfig({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    id: null,
    environment: 'homologacao',
    csc_id: '',
    csc_token: ''
  })

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data } = await supabase.from('fiscal_config').select('*').limit(1).single()
        if (data) setConfig(data)
      } catch (error) { console.error(error) } finally { setLoading(false) }
    }
    fetchConfig()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('fiscal_config').upsert({
        id: config.id,
        environment: config.environment,
        csc_id: config.csc_id,
        csc_token: config.csc_token,
        updated_at: new Date()
      })
      if (error) throw error
      toast.success('Configuração fiscal salva!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><ArrowLeft size={24} /></button>
        <div><h2 className="text-xl font-bold text-slate-800">Emissão Fiscal (NFC-e)</h2><p className="text-sm text-slate-500">Credenciais para comunicação com a SEFAZ.</p></div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-indigo-600 mt-1 flex-shrink-0" size={20}/>
          <div className="text-sm text-indigo-800">
            <p className="font-bold mb-1">Atenção:</p>
            <p>Estas informações são sensíveis. O Token CSC é fornecido pela contabilidade ou pelo portal da SEFAZ do seu estado. Sem ele, a emissão em produção não funcionará.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-50 pb-2">
            <Server className="mr-2 text-blue-600" size={20} /> Ambiente
          </h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="env" checked={config.environment === 'homologacao'} onChange={() => setConfig({...config, environment: 'homologacao'})} className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-slate-700">Homologação (Teste)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="env" checked={config.environment === 'producao'} onChange={() => setConfig({...config, environment: 'producao'})} className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-700">Produção (Valendo)</span>
            </label>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-50 pb-2">
            <Lock className="mr-2 text-blue-600" size={20} /> Credenciais CSC
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">ID do CSC</label>
              <input 
                className="input-base" 
                placeholder="Ex: 000001" 
                value={config.csc_id || ''} 
                onChange={e => setConfig({...config, csc_id: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 mt-1">Geralmente um número sequencial.</p>
            </div>
            <div className="md:col-span-2">
              <label className="label">Token CSC (Código Alfanumérico)</label>
              <input 
                className="input-base font-mono" 
                placeholder="Ex: 123456-ABCD-..." 
                value={config.csc_token || ''} 
                onChange={e => setConfig({...config, csc_token: e.target.value})}
                type="password"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center shadow-lg">
            {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Salvar Configuração
          </button>
        </div>
      </form>
    </div>
  )
}

function CompanySettings({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [settings, setSettings] = useState({
    id: null,
    company_name: '',
    cnpj: '',
    state_registration: '', 
    municipal_registration: '',
    tax_regime: '1',
    cep: '',
    address: '',
    city: ''
  })

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') throw error 
        if (data) setSettings(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({ 
          id: settings.id, 
          company_name: settings.company_name, 
          cnpj: settings.cnpj, 
          state_registration: settings.state_registration,
          municipal_registration: settings.municipal_registration,
          tax_regime: settings.tax_regime,
          cep: settings.cep, 
          address: settings.address, 
          city: settings.city,
          updated_at: new Date()
        })

      if (error) throw error
      toast.success('Salvo com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dados da Empresa</h2>
          <p className="text-sm text-slate-500">Informações legais e fiscais que aparecem na nota.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-50 pb-2">
            <Building2 className="mr-2 text-blue-600" size={20} />
            Identificação Fiscal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Razão Social</label>
              <input className="input-base" value={settings.company_name || ''} onChange={e => setSettings({...settings, company_name: e.target.value})} placeholder="Ex: Minha Empresa Ltda" />
            </div>
            <div>
              <label className="label">CNPJ</label>
              <input className="input-base" value={settings.cnpj || ''} onChange={e => setSettings({...settings, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="label">Inscrição Estadual (IE)</label>
              <input className="input-base" value={settings.state_registration || ''} onChange={e => setSettings({...settings, state_registration: e.target.value})} placeholder="Isento ou Número" />
            </div>
            <div>
              <label className="label">Regime Tributário</label>
              <select className="input-base bg-white" value={settings.tax_regime || '1'} onChange={e => setSettings({...settings, tax_regime: e.target.value})}>
                <option value="1">Simples Nacional</option>
                <option value="3">Regime Normal</option>
              </select>
            </div>
            <div>
              <label className="label">Inscrição Municipal</label>
              <input className="input-base" value={settings.municipal_registration || ''} onChange={e => setSettings({...settings, municipal_registration: e.target.value})} placeholder="Opcional" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center border-b border-slate-50 pb-2">
            <MapPin className="mr-2 text-blue-600" size={20} />
            Endereço
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">CEP</label>
              <input className="input-base" value={settings.cep || ''} onChange={e => setSettings({...settings, cep: e.target.value})} placeholder="00000-000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Cidade Principal</label>
              <input className="input-base" value={settings.city || ''} onChange={e => setSettings({...settings, city: e.target.value})} placeholder="Ex: Belo Horizonte" />
            </div>
            <div className="md:col-span-3">
              <label className="label">Endereço Completo</label>
              <input className="input-base" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} placeholder="Rua, Número, Bairro" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center transition-colors disabled:opacity-50 shadow-lg">
            {saving ? <Loader2 className="animate-spin mr-2" size={20}/> : <Save className="mr-2" size={20}/>}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  )
}

function PrinterSettings({ onBack }) {
  const [useKDS, setUseKDS] = useState(() => localStorage.getItem('hawk_use_kds') === 'true')
  
  const [askRelease, setAskRelease] = useState(() => {
    const saved = localStorage.getItem('hawk_ask_table_release')
    return saved === null ? true : saved === 'true'
  })

  const handleToggle = (value) => {
    setUseKDS(value)
    localStorage.setItem('hawk_use_kds', value)
    toast.success(value ? 'Modo KDS ativado!' : 'Modo Impressora ativado!')
  }

  const handleToggleAsk = (value) => {
    setAskRelease(value)
    localStorage.setItem('hawk_ask_table_release', value)
    toast.success('Configuração atualizada!')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Impressão e Produção</h2>
          <p className="text-sm text-slate-500">Defina como os pedidos chegam à cozinha.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => handleToggle(false)} className={`p-6 rounded-xl border-2 text-left transition-all ${!useKDS ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${!useKDS ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}><Printer size={28} /></div>
          <h3 className={`font-bold text-lg mb-2 ${!useKDS ? 'text-amber-900' : 'text-slate-700'}`}>Modo Impressora</h3>
          <p className="text-sm text-slate-500">Gera cupons de papel. O pedido nasce como "Entregue".</p>
          {!useKDS && <div className="mt-4 inline-block px-3 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">ATIVO</div>}
        </button>

        <button onClick={() => handleToggle(true)} className={`p-6 rounded-xl border-2 text-left transition-all ${useKDS ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${useKDS ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}><Monitor size={28} /></div>
          <h3 className={`font-bold text-lg mb-2 ${useKDS ? 'text-blue-900' : 'text-slate-700'}`}>Modo KDS</h3>
          <p className="text-sm text-slate-500">Pedidos vão para as telas. Fluxo: Pendente &rarr; Preparando &rarr; Pronto.</p>
          {useKDS && <div className="mt-4 inline-block px-3 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded-full">ATIVO</div>}
        </button>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Fluxo de Operação</h3>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-start gap-3">
                <div className="bg-purple-50 p-2 rounded-lg text-purple-600 mt-1">
                    <MessageSquare size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-700">Confirmar Liberação de Mesa</h4>
                    <p className="text-sm text-slate-500 max-w-md">
                        Ao finalizar uma venda com itens na cozinha, perguntar se é um Pagamento Antecipado (mantém pedido) ou Saída do Cliente (limpa pedido).
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => handleToggleAsk(!askRelease)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${askRelease ? 'bg-purple-600' : 'bg-slate-200'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${askRelease ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-bold ml-2 text-slate-600">{askRelease ? 'LIGADO' : 'DESLIGADO'}</span>
            </div>
        </div>
      </div>
    </div>
  )
}

function StockSettings({ onBack }) {
  const [activeTab, setActiveTab] = useState('pdv') // pdv, stock, financial, units

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cadastros Auxiliares</h2>
          <p className="text-sm text-slate-500">Gerencie as listas usadas no cadastro de produtos.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        <TabButton active={activeTab === 'pdv'} onClick={() => setActiveTab('pdv')} label="Categorias PDV" />
        <TabButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} label="Categorias Físicas" />
        <TabButton active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} label="Grupos Financeiros" />
        <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Unidades de Medida" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        {activeTab === 'pdv' && (
          <GenericListManager 
            table="categories" 
            label="Categoria PDV" 
            usageField="category_id" 
            usageType="id" 
          />
        )}
        {activeTab === 'stock' && (
          <GenericListManager 
            table="stock_categories_list" 
            label="Categoria Física" 
            usageField="stock_category" 
            usageType="text" 
          />
        )}
        {activeTab === 'financial' && (
          <GenericListManager 
            table="financial_groups_list" 
            label="Grupo Financeiro" 
            usageField="financial_group" 
            usageType="text"
          />
        )}
        {activeTab === 'units' && (
          <GenericListManager 
            table="units_list" 
            label="Unidade" 
            hasSymbol={true} 
            usageField="unit" 
            usageType="symbol"
          />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  )
}

function FinancialSettings({ onBack }) {
  const [loading, setLoading] = useState(true)
  
  const [methods, setMethods] = useState([])
  const [newMethod, setNewMethod] = useState('')
  const [serviceFee, setServiceFee] = useState(10)
  
  const [companySettingsId, setCompanySettingsId] = useState(null)

  const [discounts, setDiscounts] = useState([])
  const [newDiscount, setNewDiscount] = useState({ name: '', type: 'percentage', value: '' })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const { data: payData } = await supabase.from('payment_methods').select('*').order('name')
      if (payData) setMethods(payData)

      const { data: discData } = await supabase.from('discounts_config').select('*').order('name')
      if (discData) setDiscounts(discData)

      const { data: compData } = await supabase.from('company_settings').select('id, service_fee').limit(1).single()
      if (compData) {
        setServiceFee(compData.service_fee || 10)
        setCompanySettingsId(compData.id)
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveServiceFee = async () => {
    try {
      const payload = { service_fee: parseFloat(serviceFee) }
      
      if (companySettingsId) payload.id = companySettingsId

      const { error } = await supabase.from('company_settings').upsert(payload)
      if (error) throw error
      toast.success('Taxa atualizada!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar taxa.')
    }
  }

  const handleAddMethod = async () => {
    if (!newMethod) return
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{ name: newMethod, active: true }])
        .select()
        .single()
      
      if (error) throw error
      setMethods([...methods, data])
      setNewMethod('')
      toast.success('Método adicionado')
    } catch (e) { 
      console.error(e)
      toast.error('Erro ao adicionar método.') 
    }
  }

  const handleDeleteMethod = async (id) => {
    try {
      await supabase.from('payment_methods').delete().eq('id', id)
      setMethods(methods.filter(m => m.id !== id))
      toast.success('Removido')
    } catch (error) { console.error(error) }
  }

  const handleAddDiscount = async () => {
    if (!newDiscount.name || !newDiscount.value) return toast.error("Preencha nome e valor")
    try {
      const { data, error } = await supabase.from('discounts_config').insert([{ name: newDiscount.name, type: newDiscount.type, value: parseFloat(newDiscount.value) }]).select().single()
      if (error) throw error
      setDiscounts([...discounts, data])
      setNewDiscount({ name: '', type: 'percentage', value: '' })
      toast.success('Desconto criado')
    } catch (e) { console.error(e); toast.error('Erro ao salvar desconto') }
  }

  const handleDeleteDiscount = async (id) => {
    try {
      await supabase.from('discounts_config').delete().eq('id', id)
      setDiscounts(discounts.filter(d => d.id !== id))
      toast.success('Removido')
    } catch (error) { console.error(error) }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Configurações Financeiras</h2>
          <p className="text-sm text-slate-500">Taxas, Pagamentos e Descontos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Percent className="text-blue-600" size={20}/> Taxa de Serviço
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative w-32">
              <input 
                type="number" 
                value={serviceFee}
                onChange={e => setServiceFee(e.target.value)}
                className="w-full pl-4 pr-8 py-2 border border-slate-300 rounded-lg font-bold text-lg outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
            <button onClick={handleSaveServiceFee} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Salvar
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Aplicado automaticamente no PDV.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard className="text-green-600" size={20}/> Formas de Pagamento
          </h3>

          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Ex: Vale Refeição" 
              value={newMethod}
              onChange={e => setNewMethod(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-green-500"
            />
            <button 
              onClick={handleAddMethod}
              className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
            >
              <Plus size={20}/>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {methods.map(m => (
              <div key={m.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium text-slate-700">{m.name}</span>
                <button onClick={() => handleDeleteMethod(m.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Tag className="text-amber-500" size={20}/> Descontos Pré-definidos
          </h3>

          <div className="flex flex-col gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nome (Ex: Aniversário)" 
              value={newDiscount.name}
              onChange={e => setNewDiscount({...newDiscount, name: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <select 
                value={newDiscount.type}
                onChange={e => setNewDiscount({...newDiscount, type: e.target.value})}
                className="bg-slate-50 border border-slate-300 rounded-lg text-sm px-2 outline-none"
              >
                <option value="percentage">%</option>
                <option value="fixed">R$</option>
              </select>
              <input 
                type="number" 
                placeholder="Valor" 
                value={newDiscount.value}
                onChange={e => setNewDiscount({...newDiscount, value: e.target.value})}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-amber-500"
              />
              <button 
                onClick={handleAddDiscount}
                className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600"
              >
                <Plus size={20}/>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {discounts.map(d => (
              <div key={d.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-700 text-sm">{d.name}</span>
                  <span className="text-xs text-slate-500 font-bold">
                    {d.type === 'percentage' ? `${d.value}%` : `R$ ${d.value}`}
                  </span>
                </div>
                <button onClick={() => handleDeleteDiscount(d.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function GenericListManager({ table, label, hasSymbol, usageField, usageType }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [newItem, setNewItem] = useState({ name: '', symbol: '' })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }, [table])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleSave() {
    if (!newItem.name) return toast.error('Nome obrigatório')
    
    // CORREÇÃO: SANITIZAÇÃO (Se não tem símbolo, não envia)
    const payload = { name: newItem.name }
    if (hasSymbol) payload.symbol = newItem.symbol

    try {
      if (editingItem) {
        await supabase.from(table).update(payload).eq('id', editingItem.id)
        
        // Atualiza produtos que usam esse item (Cascata manual)
        if (usageType === 'text' && editingItem.name !== newItem.name) {
           await supabase.from('products').update({ [usageField]: newItem.name }).eq(usageField, editingItem.name)
        }
        if (usageType === 'symbol' && editingItem.symbol !== newItem.symbol) {
           await supabase.from('products').update({ [usageField]: newItem.symbol }).eq(usageField, editingItem.symbol)
        }

        toast.success('Atualizado com sucesso!')
      } else {
        await supabase.from(table).insert(payload)
        toast.success('Criado com sucesso!')
      }
      setNewItem({ name: '', symbol: '' })
      setEditingItem(null)
      fetchItems()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar. Verifique se o nome já existe.')
    }
  }

  async function handleDelete(item) {
    try {
      let query = supabase.from('products').select('id', { count: 'exact', head: true })
      
      if (usageType === 'id') {
        query = query.eq(usageField, item.id)
      } else if (usageType === 'text') {
        query = query.eq(usageField, item.name)
      } else if (usageType === 'symbol') {
        query = query.eq(usageField, item.symbol)
      }

      const { count } = await query
      
      if (count > 0) {
        return toast.error(`Não é possível excluir! Existem ${count} produtos usando este item.`)
      }

      const { error } = await supabase.from(table).delete().eq('id', item.id)
      if (error) throw error
      
      toast.success('Item excluído.')
      fetchItems()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir.')
    }
  }

  return (
    <div>
      <div className="flex gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg">
        {hasSymbol && (
          <div className="w-24">
            <label className="label">Símbolo</label>
            <input 
              className="input-base bg-white" 
              placeholder="Ex: kg" 
              value={newItem.symbol}
              onChange={e => setNewItem({...newItem, symbol: e.target.value})}
            />
          </div>
        )}
        <div className="flex-1">
          <label className="label">Nome da {label}</label>
          <input 
            className="input-base bg-white" 
            placeholder={`Ex: Nova ${label}`} 
            value={newItem.name}
            onChange={e => setNewItem({...newItem, name: e.target.value})}
          />
        </div>
        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 h-[46px] flex items-center shadow-md">
          {editingItem ? <Save size={20}/> : <Plus size={20}/>}
        </button>
        {editingItem && (
          <button onClick={() => { setEditingItem(null); setNewItem({name:'', symbol:''}) }} className="bg-slate-200 text-slate-600 px-4 py-3 rounded-lg font-bold hover:bg-slate-300 h-[46px]">
            <X size={20}/>
          </button>
        )}
      </div>

      {loading ? <div className="text-center py-10"><Loader2 className="animate-spin inline text-slate-400"/></div> : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                {hasSymbol && <th className="p-3">Símbolo</th>}
                <th className="p-3">Nome</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 group">
                  {hasSymbol && <td className="p-3 font-mono font-bold text-slate-600">{item.symbol}</td>}
                  <td className="p-3 font-medium text-slate-700">{item.name}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEditingItem(item); setNewItem(item) }} className="p-2 text-slate-400 hover:text-blue-600 mr-2 rounded hover:bg-blue-50">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="3" className="p-6 text-center text-slate-400 italic">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}