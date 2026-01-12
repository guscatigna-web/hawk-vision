import { useState, useEffect } from 'react'
import { Check, Loader2, Calendar, User, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function Notificacoes() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('pending_actions')
        .select(`*, created_by_user: employees!created_by (name, role)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // APROVAR: Aplica as mudanças no estoque
  async function handleApprove(task) {
    if (!confirm('Aprovar este balanço e atualizar o estoque oficial?')) return
    setProcessing(task.id)

    try {
      const items = task.data.items

      for (const item of items) {
        const diff = item.counted_quantity - item.current_stock_at_count
        if (diff === 0) continue

        // 1. Lança Movimentação
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          
          // AQUI ESTÁ A MUDANÇA:
          employee_id: task.created_by, // O responsável é QUEM CONTOU (Cozinheiro/Estoquista)
          approved_by: user.id,         // O aprovador é VOCÊ (Gerente)
          
          type: diff > 0 ? 'entrada' : 'saida',
          reason: 'balanco', 
          quantity: Math.abs(diff),
          old_stock: item.current_stock_at_count,
          new_stock: item.counted_quantity
        })

        // 2. Atualiza Produto
        await supabase.from('products')
          .update({ stock_quantity: item.counted_quantity })
          .eq('id', item.product_id)
      }

      // 3. Marca tarefa como Aprovada
      await supabase.from('pending_actions')
        .update({ status: 'approved', reviewed_by: user.id })
        .eq('id', task.id)

      toast.success('Balanço aplicado com sucesso!')
      setTasks(tasks.filter(t => t.id !== task.id))

    } catch (error) {
      console.error(error)
      toast.error('Erro ao aprovar.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(id) {
    if (!confirm('Rejeitar esta contagem?')) return
    setProcessing(id)
    try {
      await supabase.from('pending_actions')
        .update({ status: 'rejected', reviewed_by: user.id })
        .eq('id', id)
      
      toast.success('Contagem rejeitada.')
      setTasks(tasks.filter(t => t.id !== id))
    } catch (error) {
      console.error(error)
      toast.error('Erro ao rejeitar')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Bell size={24} /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Central de Notificações</h2>
          <p className="text-sm text-slate-500">Tarefas pendentes de aprovação.</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
          <Check size={48} className="mx-auto text-green-200 mb-4" />
          <p className="text-slate-500 font-medium">Tudo limpo! Nenhuma pendência.</p>
        </div>
      ) : (
        tasks.map(task => (
          <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-slate-200 text-slate-600"><User size={20} /></div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {task.created_by_user?.name} <span className="font-normal text-slate-500">({task.created_by_user?.role})</span>
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {new Date(task.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase">Aprovação de Inventário</div>
            </div>

            <div className="p-4">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-400 font-medium border-b border-slate-100">
                  <tr>
                    <th className="pb-2">Produto</th>
                    <th className="pb-2 text-center">Virtual</th>
                    <th className="pb-2 text-center">Contado</th>
                    <th className="pb-2 text-center">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {task.data.items.map((item, idx) => {
                    const diff = item.counted_quantity - item.current_stock_at_count
                    if (diff === 0) return null 
                    return (
                      <tr key={idx}>
                        <td className="py-2 font-medium text-slate-700">{item.product_name}</td>
                        <td className="py-2 text-center text-slate-400">{item.current_stock_at_count}</td>
                        <td className="py-2 text-center font-bold">{item.counted_quantity}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(3)} {item.unit}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => handleReject(task.id)} disabled={processing === task.id} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-white hover:text-red-600 transition-colors font-medium text-sm">Rejeitar</button>
              <button onClick={() => handleApprove(task)} disabled={processing === task.id} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-sm flex items-center shadow-lg shadow-slate-200">
                {processing === task.id ? <Loader2 className="animate-spin mr-2" size={16}/> : <Check className="mr-2" size={16}/>} Aprovar Balanço
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}