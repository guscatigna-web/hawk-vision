import { useState } from 'react'
import { X, Loader2, User, Mail, Briefcase, Phone, Lock, Calendar, Shield } from 'lucide-react'

export function NewEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {
  const [isSaving, setIsSaving] = useState(false)
  // Inicializa direto no useState (só funciona com a correção no Equipe.jsx)
  const [selectedRole, setSelectedRole] = useState(employeeToEdit?.role || '')

  if (!isOpen) return null

  // --- FUNÇÃO PARA PEGAR DATA LOCAL (YYYY-MM-DD) ---
  const getLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    const formData = new FormData(e.target)
    const role = formData.get('role')
    
    let avatar = '👤'
    if (role === 'Gerente') avatar = '👔'
    if (role === 'Cozinha') avatar = '👨‍🍳'
    if (role === 'Garçom') avatar = '💁'
    if (role === 'Caixa') avatar = '💻'

    const finalAvatar = employeeToEdit ? employeeToEdit.avatar : avatar

    const employeeData = {
      name: formData.get('name'),
      role: role,
      email: formData.get('email'),
      phone: formData.get('phone'),
      status: formData.get('status') || 'Ativo',
      avatar: finalAvatar,
      admission_date: formData.get('admission_date') || getLocalDate(),
      access_pin: formData.get('access_pin') || null
    }

    const password = formData.get('password')
    if (password) {
      employeeData.password = password
    }

    if (employeeToEdit) {
      await onSave({ ...employeeData, id: employeeToEdit.id })
    } else {
      await onSave(employeeData)
    }

    setIsSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] m-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {employeeToEdit ? <User className="text-blue-600"/> : <User className="text-green-600"/>}
            {employeeToEdit ? 'Editar Dados' : 'Novo Colaborador'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* FORMULÁRIO COM SCROLL */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-5">
            
            {/* Nome */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input 
                  name="name" 
                  required 
                  defaultValue={employeeToEdit?.name} 
                  placeholder="Ex: Maria Silva" 
                  className="w-full pl-10 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                />
              </div>
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Cargo & Acesso</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <select 
                  name="role" 
                  required 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full pl-10 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  <optgroup label="Gestão">
                    <option value="Gerente">Gerente</option>
                  </optgroup>
                  <optgroup label="Operacional">
                    <option value="Caixa">Caixa</option>
                    <option value="Garçom">Garçom</option>
                    <option value="Cozinha">Cozinha</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">E-mail (Login)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input name="email" type="email" defaultValue={employeeToEdit?.email} className="w-full pl-10 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@empresa.com" />
                </div>
              </div>

              {/* Senha (Login) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Senha de Login</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input name="password" type="password" placeholder={employeeToEdit ? "(Manter)" : "123456"} className="w-full pl-10 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input name="phone" type="tel" defaultValue={employeeToEdit?.phone} className="w-full pl-10 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="(00) 00000-0000" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Status</label>
                <select name="status" defaultValue={employeeToEdit?.status || 'Ativo'} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                  <option value="Ativo">Ativo</option>
                  <option value="Férias">Férias</option>
                  <option value="Afastado">Afastado</option>
                  <option value="Desligado">Desligado</option>
                </select>
              </div>
            </div>

            {/* Data Admissão */}
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Data de Admissão</label>
               <div className="relative">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                 <input name="admission_date" type="date" defaultValue={employeeToEdit?.admission_date || getLocalDate()} className="w-full pl-10 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
            </div>

            {/* ÁREA DE SEGURANÇA (Só aparece se for Gerente) */}
            {selectedRole === 'Gerente' && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-fade-in mt-2">
                <div className="flex items-start gap-3 mb-3">
                  <Shield className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div className="text-xs text-amber-800">
                    <strong>Acesso Privilegiado:</strong> Gerentes possuem um PIN para autorizar descontos, estornos e cancelamentos no caixa.
                  </div>
                </div>
                <label className="block text-xs font-bold text-amber-900 uppercase mb-1.5 ml-1">Definir PIN de Acesso (Numérico)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none font-bold">PIN</div>
                  <input 
                    name="access_pin" 
                    type="text" 
                    inputMode="numeric" 
                    maxLength={6} 
                    defaultValue={employeeToEdit?.access_pin} 
                    placeholder="Ex: 1234" 
                    className="w-full pl-12 p-3 border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-lg font-bold tracking-widest text-slate-700" 
                  />
                </div>
              </div>
            )}

          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-6 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold flex justify-center items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50">
              {isSaving ? <Loader2 className="animate-spin" /> : (employeeToEdit ? 'Salvar Alterações' : 'Cadastrar')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}