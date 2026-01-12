import { useState, useEffect } from 'react'
import { X, ChefHat, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function ProductionModal({ isOpen, onClose, product, onConfirm }) {
  const { user } = useAuth()
  const [quantity, setQuantity] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(true)

  // Carrega a receita para mostrar a estimativa de consumo
  useEffect(() => {
    async function loadRecipe() {
      if (!product) return;
      const { data } = await supabase
        .from('product_ingredients')
        .select(`quantity, ingredient: products!ingredient_id (name, unit, stock_quantity)`)
        .eq('product_id', product.id)
      
      setIngredients(data || [])
      setCalculating(false)
    }
    loadRecipe()
  }, [product])

  if (!isOpen) return null

  const handleProduce = async (e) => {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0) return toast.error("Informe a quantidade.")

    setLoading(true)
    try {
      // Chama a função mágica que criamos no Banco de Dados (RPC)
      const { error } = await supabase.rpc('register_production', {
        p_product_id: product.id,
        p_quantity: Number(quantity),
        p_employee_id: user.id
      })

      if (error) throw error

      toast.success(`Produção registrada! Estoques atualizados.`)
      onConfirm()
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao registrar produção.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <ChefHat className="mr-2 text-amber-500" /> Registrar Produção
            </h2>
            <p className="text-sm text-slate-500">Item: <span className="font-bold">{product?.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleProduce} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantidade Produzida ({product?.unit})
            </label>
            <input 
              type="number" 
              step="0.001"
              required
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="Ex: 5"
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-lg font-bold text-slate-700"
              autoFocus
            />
          </div>

          {/* PREVISÃO DE CONSUMO */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Estimativa de Consumo</h3>
            
            {calculating ? (
              <Loader2 className="animate-spin text-slate-400 mx-auto" />
            ) : ingredients.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center">Este produto não tem ficha técnica cadastrada.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {ingredients.map((item, idx) => {
                  const qtdToConsume = (item.quantity * (Number(quantity) || 0));
                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-700">{item.ingredient.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">
                          (Estoque: {item.ingredient.stock_quantity})
                        </span>
                        <span className="font-bold text-red-600">
                           - {qtdToConsume.toFixed(3)} {item.ingredient.unit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || ingredients.length === 0}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Produção'}
          </button>

        </form>
      </div>
    </div>
  )
}