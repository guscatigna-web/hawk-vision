import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase' 
import toast from 'react-hot-toast'

export function CompanySettings() {
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    company_name: '',
    cnpj: '',
    address: '',
    city: '',
    cep: '',
    state_registration: '',
    municipal_registration: '',
    phone: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // CORREÇÃO: Removido 'error' que não estava sendo usado
      const { data } = await supabase.from('company_settings').select('*').single()
      if (data) setFormData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    const toastId = toast.loading('Salvando...')
    try {
      const { error } = await supabase.from('company_settings').upsert(formData)
      if (error) throw error
      toast.success('Dados salvos!', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar.', { id: toastId })
    }
  }

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-slate-400"/></div>

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-4">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-lg font-bold text-slate-700">Dados Cadastrais</h2>
         <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold">
            <Save size={18} /> Salvar Alterações
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Razão Social / Nome Fantasia</label>
            <input required type="text" className="w-full p-2 border rounded-lg" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
        </div>
        
        <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">CNPJ</label>
            <input required type="text" className="w-full p-2 border rounded-lg" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Inscrição Estadual</label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.state_registration} onChange={e => setFormData({...formData, state_registration: e.target.value})} />
        </div>

        <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Endereço Completo</label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cidade / UF</label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">CEP</label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} />
        </div>
      </div>
    </form>
  )
}