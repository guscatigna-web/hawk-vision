import { useState } from 'react'
import { X, ArrowUpCircle, ArrowDownCircle, Loader2, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function StockAdjustmentModal({ isOpen, onClose, product, onConfirm }) {
  const { user } = useAuth() 
  const [loading, setLoading] = useState(false)
  
  // VERIFICAÇÃO DE CARGO
  const isManager = user?.role === 'Gerente'

  const [type, setType] = useState('entrada') 
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('compra') 

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0) {
      return toast.error("Informe uma quantidade válida.")
    }

    setLoading(true)
    const qtd = Number(quantity)
    
    // Calcula o novo estoque
    const newStock = type === 'entrada' 
      ? product.stock_quantity + qtd 
      : product.stock_quantity - qtd

    try {
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: product.id,
          employee_id: user.id,
          type: type,
          reason: reason,
          quantity: qtd,
          old_stock: product.stock_quantity,
          new_stock: newStock
        }])

      if (moveError) throw moveError

      const { error: prodError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id)

      if (prodError) throw prodError

      toast.success(`Estoque atualizado! Novo saldo: ${newStock} ${product.unit}`)
      onConfirm() 
      onClose()

    } catch (error) {
      console.error(error)
      toast.error("Erro ao movimentar estoque.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Ajuste de Estoque</h2>
            <p className="text-sm text-slate-500">Produto: <span className="font-bold text-blue-600">{product?.name}</span></p>
            <p className="text-xs text-slate-400 mt-1">Saldo Atual: {product?.stock_quantity} {product?.unit}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          
          {/* SELETOR DE TIPO (ENTRADA / SAÍDA) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('entrada')}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                type === 'entrada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-100 text-slate-400 hover:border-green-200'
              }`}
            >
              <ArrowUpCircle size={24} className="mb-1" />
              <span className="font-bold text-sm">Entrada (+)</span>
            </button>

            {/* BOTÃO DE SAÍDA - BLOQUEADO SE NÃO FOR GERENTE */}
            <button
              type="button"
              disabled={!isManager}
              onClick={() => isManager && setType('saida')}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                !isManager 
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60' 
                  : type === 'saida' 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-slate-100 text-slate-400 hover:border-red-200'
              }`}
              title={!isManager ? "Apenas Gerentes podem realizar baixa manual" : "Registrar perda, quebra ou consumo"}
            >
              <ArrowDownCircle size={24} className="mb-1" />
              <span className="font-bold text-sm">Saída (-)</span>
              {!isManager && <span className="text-[10px] uppercase font-bold mt-1">Gerente</span>}
            </button>
          </div>

          {/* QUANTIDADE E MOTIVO */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade ({product?.unit})</label>
              <input 
                type="number" 
                step="0.001"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-slate-700"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da Movimentação</label>
              <select 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {type === 'entrada' ? (
                  <>
                    <option value="compra">📦 Compra / Reposição</option>
                    <option value="producao">👨‍🍳 Produção Interna</option>
                    <option value="devolucao">↩️ Devolução de Cliente</option>
                    <option value="ajuste_sobra">⚖️ Ajuste de Inventário (Sobra)</option>
                  </>
                ) : (
                  <>
                    <option value="uso_interno">🍽️ Consumo Interno / Staff</option>
                    <option value="perda">🗑️ Perda / Quebra</option>
                    <option value="validade">📅 Vencimento / Validade</option>
                    <option value="ajuste_falta">⚖️ Ajuste de Inventário (Falta)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold shadow-md flex items-center justify-center transition-colors ${
              type === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} className="mr-2"/> Confirmar {type === 'entrada' ? 'Entrada' : 'Baixa'}</>}
          </button>

        </form>
      </div>
    </div>
  )
}