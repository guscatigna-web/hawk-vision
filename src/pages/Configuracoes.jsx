import { useState } from 'react'
import { Building2, CreditCard, Receipt, Printer, Tags } from 'lucide-react'

// Importando os componentes
import { CompanySettings } from '../components/settings/CompanySettings'
import { FiscalSettings } from '../components/settings/FiscalSettings'
import { PaymentSettings } from '../components/settings/PaymentSettings'
import { PrintSettings } from '../components/settings/PrintSettings'
import { GeneralRegisters } from '../components/settings/GeneralRegisters' // <--- Novo Componente

export function Configuracoes() {
  const [activeTab, setActiveTab] = useState('empresa')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-blue-600" /> Configurações do Sistema
        </h1>
        <p className="text-slate-500">Gerencie dados da empresa, impressoras, fiscal e cadastros auxiliares.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar de Abas */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
          <TabButton id="empresa" label="Dados da Empresa" icon={<Building2 size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="cadastros" label="Cadastros Gerais" icon={<Tags size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="fiscal" label="Fiscal (NFC-e)" icon={<Receipt size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="pagamento" label="Pagamentos" icon={<CreditCard size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="impressao" label="Impressão & KDS" icon={<Printer size={18}/>} active={activeTab} onClick={setActiveTab} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-6 min-h-[500px]">
          {activeTab === 'empresa' && <CompanySettings />}
          {activeTab === 'cadastros' && <GeneralRegisters />} 
          {activeTab === 'fiscal' && <FiscalSettings />}
          {activeTab === 'pagamento' && <PaymentSettings />}
          {activeTab === 'impressao' && <PrintSettings />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all w-full text-left whitespace-nowrap ${
        active === id 
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}