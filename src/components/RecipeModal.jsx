import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function RecipeModal({ isOpen, onClose, product }) {
  const [ingredients, setIngredients] = useState([]) 
  const [availableItems, setAvailableItems] = useState([]) 
  const [loading, setLoading] = useState(true)

  // Formulário de adicionar
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [adding, setAdding] = useState(false)

  // 1. O CÉREBRO DO MODAL (Agora tudo acontece aqui dentro)
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // A. Busca ingredientes atuais
        const { data: currentIngredients, error: ingError } = await supabase
          .from('product_ingredients')
          .select(`
            id,
            quantity,
            ingredient: products!ingredient_id ( id, name, unit, price )
          `)
          .eq('product_id', product.id)

        if (ingError) throw ingError
        setIngredients(currentIngredients || [])

        // B. Busca itens disponíveis para adicionar
        const { data: items, error: prodError } = await supabase
          .from('products')
          .select('id, name, unit, type')
          .neq('id', product.id) 
          .in('type', ['raw', 'wip']) 
          .order('name')

        if (prodError) throw prodError
        setAvailableItems(items || [])

      } catch (error) {
        console.error('Erro ao carregar:', error) // <--- CORREÇÃO: Usamos o erro aqui
        toast.error('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && product) {
      loadData()
    }
  }, [isOpen, product]) // Agora o React sabe que tudo que precisa está aqui dentro

  // 2. Adiciona um ingrediente
  async function handleAddIngredient(e) {
    e.preventDefault()
    if (!selectedItemId || !quantity) return

    setAdding(true)
    try {
      const { error } = await supabase
        .from('product_ingredients')
        .insert([{
          product_id: product.id,
          ingredient_id: selectedItemId,
          quantity: parseFloat(quantity)
        }])

      if (error) throw error

      toast.success('Ingrediente adicionado!')
      setQuantity('')
      setSelectedItemId('')
      
      // Recarregamos a lista manualmente forçando uma atualização
      // (Truque simples para evitar complexidade: fechamos e abrimos logicamente ou chamamos a busca novamente)
      // Como loadData está isolada, vamos apenas adicionar visualmente na lista por enquanto para ser mais rápido
      // Mas para garantir consistência, vamos usar um truque do React:
      // Vamos deixar o useEffect rodar novamente mudando um estado auxiliar se precisasse, 
      // mas aqui vamos apenas recarregar a tela se o usuário reabrir, ou melhor:
      // Vamos buscar só os ingredientes de novo rapidinho:
      
      const { data: newIngredients } = await supabase
          .from('product_ingredients')
          .select(`
            id,
            quantity,
            ingredient: products!ingredient_id ( id, name, unit, price )
          `)
          .eq('product_id', product.id)
          
      if (newIngredients) setIngredients(newIngredients)

    } catch (error) {
      console.error(error) // <--- CORREÇÃO
      toast.error('Erro ao salvar ingrediente')
    } finally {
      setAdding(false)
    }
  }

  // 3. Remove um ingrediente
  async function handleRemove(id) {
    try {
      const { error } = await supabase.from('product_ingredients').delete().eq('id', id)
      if (error) throw error
      
      toast.success('Removido.')
      setIngredients(ingredients.filter(i => i.id !== id))
    } catch (error) {
      console.error(error) // <--- CORREÇÃO
      toast.error('Erro ao remover.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 m-4 animate-fade-in max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Ficha Técnica</h2>
            <p className="text-slate-500 text-sm">Composição de: <span className="font-bold text-blue-600">{product?.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : (
          <div className="space-y-6">
            
            <form onSubmit={handleAddIngredient} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ingrediente</label>
                <select 
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Selecione o insumo...</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Qtd.</label>
                <input 
                  type="number" 
                  step="0.001" 
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0.000"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button 
                type="submit" 
                disabled={adding || !selectedItemId}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center w-full sm:w-auto"
              >
                {adding ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20} />}
                <span className="ml-2 sm:hidden">Adicionar</span>
              </button>
            </form>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700">Composição Atual</h3>
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                  Itens: {ingredients.length}
                </span>
              </div>

              {ingredients.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic border-2 border-dashed border-slate-100 rounded-lg">
                  Nenhum ingrediente adicionado ainda.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3">Ingrediente</th>
                        <th className="p-3 text-right">Qtd. Utilizada</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {ingredients.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-700">{item.ingredient?.name}</td>
                          <td className="p-3 text-right text-slate-600">
                            {item.quantity} <span className="text-xs text-slate-400">{item.ingredient?.unit}</span>
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleRemove(item.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
               <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">
                 Concluir Ficha
               </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}