import { useState } from 'react'
import { X, Loader2, User, Mail, Briefcase, Phone, Lock, Shield } from 'lucide-react'

// Importante: A prop 'key' passada no Pai (Equipe.jsx) garante que este 
// componente resete seus states quando mudamos de funcionário.
export function NewEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {
  const [isSaving, setIsSaving] = useState(false)
  
  // Inicialização direta do State (Sem useEffect)
  // Como o componente é recriado pela 'key' no pai, isso roda fresco a cada abertura.
  const [selectedRole, setSelectedRole] = useState(employeeToEdit?.role || 'Garçom')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    const formData = new FormData(e.target)
    
    const data = {
        id: employeeToEdit?.id,
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role'),
        phone: formData.get('phone'),
        password: formData.get('password'), 
        access_pin: formData.get('access_pin'),
    }

    await onSave(data)
    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {employeeToEdit ? <><User size={24} className="text-amber-400"/> Editar Colaborador</> : <><UserPlus size={24} className="text-amber-400"/> Novo Colaborador</>}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nome Completo */}
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <User size={16} className="text-amber-500"/> Nome Completo
              </label>
              <input name="name" required defaultValue={employeeToEdit?.name} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="Ex: João da Silva" />
            </div>

            {/* Email (Login) */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Mail size={16} className="text-amber-500"/> Email (Login)
              </label>
              <input name="email" type="email" required defaultValue={employeeToEdit?.email} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="joao@hawk.com" />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Lock size={16} className="text-amber-500"/> Senha de Acesso
              </label>
              <input 
                name="password" 
                type="text" 
                required={!employeeToEdit} 
                defaultValue={employeeToEdit?.password} 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono" 
                placeholder="Mínimo 6 caracteres" 
              />
            </div>

            {/* Cargo */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Briefcase size={16} className="text-amber-500"/> Cargo / Função
              </label>
              <select 
                name="role" 
                required 
                value={selectedRole} 
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
              >
                <option value="" disabled>Selecione...</option>
                <option value="Gerente">Gerente</option>
                <option value="Caixa">Caixa</option>
                <option value="Garçom">Garçom</option>
                <option value="Cozinha">Cozinha</option>
                <option value="Entregador">Entregador</option>
              </select>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Phone size={16} className="text-amber-500"/> WhatsApp
              </label>
              <input name="phone" type="tel" defaultValue={employeeToEdit?.phone} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="(00) 00000-0000" />
            </div>

            {/* PIN de Acesso */}
            <div className="col-span-2 md:col-span-1 space-y-2">
               <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Shield size={16} className="text-amber-500"/> PIN de Acesso Rápido
               </label>
               <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-xs">PIN</div>
                  <input 
                    name="access_pin" 
                    type="text" 
                    maxLength={6} 
                    defaultValue={employeeToEdit?.access_pin} 
                    placeholder="1234" 
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold tracking-widest text-slate-800"
                  />
               </div>
            </div>

          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-6 flex gap-3 border-t border-slate-100 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold flex justify-center items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50">
              {isSaving ? <Loader2 className="animate-spin" /> : (employeeToEdit ? 'Salvar Alterações' : 'Cadastrar Funcionário')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UserPlus({size, className}) {
    return <User size={size} className={className} />
}