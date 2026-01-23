import { useState, useEffect } from 'react'
import { CreditCard, Loader2, Plus, Archive, Undo2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function PaymentSettings() {
    const [methods, setMethods] = useState([])
    const [loading, setLoading] = useState(true)
    const [newMethod, setNewMethod] = useState('')
    const [viewArchived, setViewArchived] = useState(false)

    useEffect(() => {
        fetchMethods()
    }, [])

    async function fetchMethods() {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('payment_methods')
                .select('*')
                .order('name')
            setMethods(data || [])
        } catch (error) {
            // CORREÇÃO: Adicionado uso da variável error
            console.error(error)
            toast.error('Erro ao buscar métodos')
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd(e) {
        e.preventDefault()
        if(!newMethod.trim()) return

        try {
            const { error } = await supabase.from('payment_methods').insert([{ 
                name: newMethod, 
                active: true 
            }])
            if (error) throw error
            
            toast.success('Método adicionado!')
            setNewMethod('')
            fetchMethods()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao adicionar')
        }
    }

    async function handleToggleActive(method) {
        const action = method.active ? 'arquivar' : 'restaurar'
        const nextStatus = !method.active

        if(!confirm(`Deseja realmente ${action} a forma de pagamento "${method.name}"?`)) return

        try {
            const { error } = await supabase
                .from('payment_methods')
                .update({ active: nextStatus })
                .eq('id', method.id)
            
            if (error) throw error
            
            toast.success(`Método ${method.active ? 'arquivado' : 'restaurado'} com sucesso!`)
            fetchMethods()
        } catch (error) {
            console.error(error)
            toast.error(`Erro ao ${action} método`)
        }
    }

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-slate-400"/></div>

    const filteredMethods = methods.filter(m => viewArchived ? !m.active : m.active)

    return (
        <div className="max-w-xl space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Formas de Pagamento</h2>
            
            {!viewArchived && (
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Novo método (ex: Pix, Vale Refeição)" 
                        className="flex-1 p-2 border rounded-lg"
                        value={newMethod}
                        onChange={e => setNewMethod(e.target.value)}
                    />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-bold">
                        <Plus size={18} /> Adicionar
                    </button>
                </form>
            )}

            <div className="flex justify-end">
                <button 
                  onClick={() => setViewArchived(!viewArchived)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border transition-colors ${
                    viewArchived 
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                   {viewArchived ? <Undo2 size={14}/> : <Archive size={14}/>}
                   {viewArchived ? 'Voltar para Ativos' : 'Ver Arquivados'}
                </button>
            </div>

            <div className="space-y-2">
                {filteredMethods.length === 0 && (
                    <div className="text-center p-8 text-slate-400 border border-dashed rounded-lg">
                        Nenhum método {viewArchived ? 'arquivado' : 'ativo'} encontrado.
                    </div>
                )}
                
                {filteredMethods.map(method => (
                    <div key={method.id} className={`flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm ${!method.active ? 'opacity-75 bg-slate-50' : ''}`}>
                        <div className="flex items-center gap-3">
                            <CreditCard className="text-slate-400" size={20} />
                            <span className={`font-medium ${!method.active ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                {method.name}
                            </span>
                            {!method.active && (
                                <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Arquivado
                                </span>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => handleToggleActive(method)} 
                            className={`p-2 rounded transition-colors ${
                                method.active 
                                    ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            }`}
                            title={method.active ? "Arquivar" : "Restaurar"}
                        >
                            {method.active ? <Archive size={18} /> : <Undo2 size={18} />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}