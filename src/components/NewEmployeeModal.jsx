import { useState } from 'react'
import { X, Loader2, User, Mail, Briefcase, Phone, Lock, Shield, Info } from 'lucide-react'

// Importante: A prop 'key' passada no Pai (Equipe.jsx) garante que este 
// componente resete seus states quando mudamos de funcionário.
export function NewEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {
  const [isSaving, setIsSaving] = useState(false)
  
  // Inicialização direta do State
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg"><User size={20} /></div>
                {employeeToEdit ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                <X size={20} />
            </button>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
            <form id="employeeForm" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NOME */}
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></div>
                            <input name="name" required defaultValue={employeeToEdit?.name} placeholder="Ex: João Silva" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all" />
                        </div>
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={18} /></div>
                            <input name="email" type="email" required defaultValue={employeeToEdit?.email} placeholder="joao@hawk.com" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700" />
                        </div>
                    </div>

                    {/* TELEFONE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp / Telefone</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={18} /></div>
                            <input name="phone" defaultValue={employeeToEdit?.phone} placeholder="(00) 00000-0000" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700" />
                        </div>
                    </div>

                    {/* CARGO */}
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Função no Sistema</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['Garçom', 'Cozinha', 'Caixa', 'Gerente'].map(role => (
                                <label key={role} className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${selectedRole === role ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-500' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                                    <input type="radio" name="role" value={role} checked={selectedRole === role} onChange={() => setSelectedRole(role)} className="hidden" />
                                    <span className="text-sm font-bold">{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* SEGURANÇA */}
                    <div className="col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-100">
                       <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3"><Shield size={16}/> Credenciais de Acesso</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <div className="text-xs font-bold text-amber-700 mb-1 ml-1">Senha (Login)</div>
                              <div className="relative">
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50"><Lock size={16} /></div>
                                  <input name="password" type="password" placeholder={employeeToEdit ? "Manter atual" : "Mínimo 6 dígitos"} className="w-full pl-9 p-2.5 bg-white border border-amber-200 rounded-lg outline-none focus:border-amber-500 text-sm" />
                              </div>
                           </div>
                           <div>
                              <div className="text-xs font-bold text-amber-700 mb-1 ml-1">PIN (Ações Rápidas)</div>
                              <input name="access_pin" type="text" maxLength={6} defaultValue={employeeToEdit?.access_pin} placeholder="1234" className="w-full p-2.5 bg-white border border-amber-200 rounded-lg outline-none focus:border-amber-500 text-sm font-mono text-center tracking-widest font-bold" />
                           </div>
                       </div>
                    </div>
                </div>

                {/* LGPD DISCLAIMER - NOVO BLOCO */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-3 items-start">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-slate-500 leading-tight text-justify">
                        <strong>Transparência LGPD:</strong> Ao cadastrar este colaborador, você declara que coletou os dados pessoais estritamente para fins de execução do contrato de trabalho e operação do sistema Hawk Vision. Os dados serão protegidos conforme nossa Política de Privacidade Interna.
                    </p>
                </div>

            </form>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-colors">Cancelar</button>
            <button form="employeeForm" type="submit" disabled={isSaving} className="flex-1 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold flex justify-center items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50">
              {isSaving ? <Loader2 className="animate-spin" /> : (employeeToEdit ? 'Salvar Alterações' : 'Cadastrar Colaborador')}
            </button>
        </div>

      </div>
    </div>
  )
}