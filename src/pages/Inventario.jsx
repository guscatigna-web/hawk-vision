import { useState, useEffect } from 'react'
import { CheckCircle, Loader2, Search, Send, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { PrintPortal } from '../components/Receipts' // IMPORTAR O PORTAL
import toast from 'react-hot-toast'

export function Inventario() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [counts, setCounts] = useState({})
  
  // Estado para controlar a impressão via Portal
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('track_stock', true)
        .order('name')
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleCountChange = (id, value) => {
    setCounts(prev => ({ ...prev, [id]: value }))
  }

  const handleSendForApproval = async () => {
    const itemsToUpdate = Object.keys(counts).filter(key => counts[key] !== '')
    
    if (itemsToUpdate.length === 0) return toast.error("Nenhum item contado.")

    if (!confirm(`Enviar contagem de ${itemsToUpdate.length} itens para aprovação do Gerente?`)) return

    setSaving(true)
    try {
      const auditData = itemsToUpdate.map(productId => {
        const product = products.find(p => p.id === parseInt(productId))
        return {
          product_id: product.id,
          product_name: product.name,
          unit: product.unit,
          current_stock_at_count: product.stock_quantity,
          counted_quantity: parseFloat(counts[productId])
        }
      })

      const { error } = await supabase.from('pending_actions').insert({
        type: 'inventory_audit',
        created_by: user.id,
        status: 'pending',
        data: { items: auditData }
      })

      if (error) throw error

      toast.success("Auditoria enviada para o Gerente!")
      setCounts({})

    } catch (error) {
      console.error(error)
      toast.error("Erro ao enviar.")
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    // Pequeno delay para o Portal renderizar e o CSS ser aplicado
    setTimeout(() => {
        window.print()
        setIsPrinting(false)
    }, 200)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="space-y-6">
      
      {/* --- ÁREA DE IMPRESSÃO (VIA PORTAL) --- */}
      {isPrinting && (
        <PrintPortal>
            <div className="print-a4-landscape">
                <div className="print-header-a4 mb-6">
                    <h1 className="text-2xl font-bold uppercase">Folha de Contagem de Estoque (Cega)</h1>
                    <div className="flex justify-between mt-4 text-sm font-normal">
                        <p>Data: {new Date().toLocaleDateString()}</p>
                        <p>Responsável: ____________________________________</p>
                    </div>
                </div>

                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr>
                            <th className="py-2 w-1/2 border border-slate-400 px-2 bg-slate-100">Produto</th>
                            <th className="py-2 text-center border border-slate-400 px-2 bg-slate-100">Unidade</th>
                            <th className="py-2 text-right border border-slate-400 px-2 bg-slate-100">Contagem Física</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                        <tr key={p.id}>
                            <td className="py-3 px-2 border border-slate-400 font-bold">{p.name}</td>
                            <td className="py-3 px-2 text-center border border-slate-400">{p.unit}</td>
                            <td className="py-3 px-2 text-right border border-slate-400">
                                {/* Linha para escrever */}
                                <div className="inline-block w-full h-6 border-b border-black"></div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PrintPortal>
      )}

      {/* --- ÁREA DA TELA (Inputs e Botões) --- */}
      <div className="no-print space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Inventário Cego</h2>
            <p className="text-sm text-slate-500">Realize a contagem. As divergências serão analisadas pelo Gerente.</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handlePrint} 
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center shadow-sm transition-colors"
            >
              <Printer className="mr-2" size={18}/>
              Imprimir Folha
            </button>

            <button 
              onClick={handleSendForApproval}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-sm disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={18}/>}
              Enviar para Análise
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar item para contar..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4 w-48 text-right">Contagem Física</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const countedVal = counts[product.id] || ''
                const isFilled = countedVal !== ''
                
                return (
                  <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isFilled ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {product.name}
                      <span className="text-xs text-slate-400 font-normal ml-1">({product.unit})</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <input 
                        type="number" 
                        step="0.001"
                        value={countedVal}
                        onChange={(e) => handleCountChange(product.id, e.target.value)}
                        placeholder="Qtd."
                        className={`w-full p-2 text-right font-bold border rounded-lg outline-none focus:ring-2 ${
                          isFilled ? 'border-blue-300 ring-blue-100 text-blue-700' : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}