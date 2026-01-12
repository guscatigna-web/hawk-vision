import { useState } from 'react'
import { X, Loader2, User, Mail, Briefcase, Phone, Lock } from 'lucide-react'

export function NewEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  // --- FUNÇÃO PARA PEGAR DATA LOCAL (YYYY-MM-DD) ---
  // Evita o problema de salvar "amanhã" se for feito à noite
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
      // Se for edição, mantém o que tem. Se for novo, usa a data LOCAL correta.
      admission_date: employeeToEdit ? employeeToEdit.admission_date : getLocalDate()
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-fade-in">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {employeeToEdit ? 'Editar Dados' : 'Novo Colaborador'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input name="name" required defaultValue={employeeToEdit?.name} placeholder="Ex: Maria Silva" className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo & Acesso</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select name="role" required defaultValue={employeeToEdit?.role} className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Selecione...</option>
                <optgroup label="Acesso Total"><option value="Gerente">Gerente</option></optgroup>
                <optgroup label="Operacional"><option value="Caixa">Caixa</option><option value="Garçom">Garçom</option><option value="Cozinha">Cozinha</option></optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Login (E-mail)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="email" type="email" required defaultValue={employeeToEdit?.email} className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="password" type="text" placeholder={employeeToEdit ? "(Manter)" : "123456"} className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input name="phone" type="tel" defaultValue={employeeToEdit?.phone} className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Status */}
          {employeeToEdit && (
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" defaultValue={employeeToEdit.status} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="Ativo">Ativo</option><option value="Férias">Férias</option><option value="Afastado">Afastado</option><option value="Desligado">Desligado</option>
              </select>
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={isSaving} className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium flex justify-center items-center">
              {isSaving ? <Loader2 className="animate-spin" /> : (employeeToEdit ? 'Salvar Alterações' : 'Cadastrar Equipe')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}