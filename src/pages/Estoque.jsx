import { useState, useEffect } from 'react'
import { Package, AlertTriangle, Plus, Loader2, Trash2, ClipboardList, Pencil, ArrowRightLeft, ChefHat, MoreHorizontal, Search, Printer, FileSpreadsheet } from 'lucide-react' 
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext' 
import { NewProductModal } from '../components/NewProductModal'
import { RecipeModal } from '../components/RecipeModal'
import { StockAdjustmentModal } from '../components/StockAdjustmentModal'
import { ProductionModal } from '../components/ProductionModal'
import { exportToCSV } from '../utils/excelUtils'
import { PrintPortal } from '../components/Receipts' // IMPORT NECESSÁRIO
import toast from 'react-hot-toast'

export function Estoque() {
  const { user } = useAuth()
  const isManager = user?.role === 'Gerente'

  const [products, setProducts] = useState([])
  const [stockCategories, setStockCategories] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false) // ESTADO DE IMPRESSÃO
  
  // Controle de Menus e Modais
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState(null)
  
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState(null) 
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState(null) 
  const [selectedProductForProduction, setSelectedProductForProduction] = useState(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      
      setProducts(data)
      
      const uniqueStockCats = [...new Set(data.map(p => p.stock_category).filter(Boolean))]
      setStockCategories(uniqueStockCats.sort())

    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      toast.error('Erro ao carregar estoque')
    } finally {
      setLoading(false)
    }
  }

  // --- Funções de Ação ---

  async function handleSaveProduct(productData) {
    try {
      if (productToEdit) {
        const { error } = await supabase.from('products').update(productData).eq('id', productToEdit.id)
        if (error) throw error
        toast.success('Produto atualizado!')
      } else {
        const { error } = await supabase.from('products').insert([productData])
        if (error) throw error
        toast.success('Produto criado!')
      }
      setIsProductModalOpen(false)
      setProductToEdit(null)
      fetchProducts() 
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar')
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('Tem certeza?')) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      toast.success('Excluído')
      fetchProducts()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir')
    }
  }

  function handleExportExcel() {
    const dataToExport = products.map(p => ({
      nome: p.name,
      categoria: p.stock_category || 'Geral',
      preco: p.price,
      estoque: p.stock_quantity
    }))
    exportToCSV(dataToExport, 'estoque')
  }

  // NOVA LÓGICA DE IMPRESSÃO
  function handlePrint() {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 200)
  }

  // Lógica de Filtros
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))
    const matchesCategory = selectedCategory === 'Todas' || p.stock_category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // --- BARRA DE NÍVEL VISUAL ---
  const StockLevelBar = ({ current, min, max }) => {
    const visualMax = max || (min ? min * 3 : 100)
    const percentage = Math.min(100, Math.max(0, (current / visualMax) * 100))
    let colorClass = 'bg-green-500'
    if (current <= 0) colorClass = 'bg-slate-300'
    else if (current <= (min || 0)) colorClass = 'bg-red-500'
    else if (current <= (min || 0) * 1.5) colorClass = 'bg-amber-400'

    return (
      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden border border-slate-200">
        <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    )
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={48} /></div>

  return (
    <div className="space-y-6" onClick={() => setMenuOpenId(null)}>
      
      {/* --- ÁREA DE IMPRESSÃO VIA PORTAL (SOLUÇÃO TELA BRANCA) --- */}
      {isPrinting && (
        <PrintPortal>
          <div className="print-a4-landscape">
            <div className="print-header-a4">
              <h1 className="text-2xl font-bold uppercase text-center mb-2">Relatório de Estoque (Físico)</h1>
              <div className="flex justify-between text-sm border-b border-black pb-2 mb-4">
                <p>Data: {new Date().toLocaleString('pt-BR')}</p>
                <p>Categoria: {selectedCategory}</p>
                <p>Total Itens: {filteredProducts.length}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-400 px-2 py-1 bg-slate-100">Produto</th>
                  <th className="border border-slate-400 px-2 py-1 bg-slate-100">Categoria</th>
                  <th className="border border-slate-400 px-2 py-1 bg-slate-100 text-right">Custo Unit.</th>
                  <th className="border border-slate-400 px-2 py-1 bg-slate-100 text-center">Atual</th>
                  <th className="border border-slate-400 px-2 py-1 bg-slate-100 text-center">Mínimo</th>
                  <th className="border border-slate-400 px-2 py-1 bg-slate-100 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const isLow = product.track_stock && product.stock_quantity <= (product.min_stock_quantity || 0)
                  return (
                    <tr key={product.id}>
                      <td className="border border-slate-400 px-2 py-1 font-bold">{product.name}</td>
                      <td className="border border-slate-400 px-2 py-1">{product.stock_category || '-'}</td>
                      <td className="border border-slate-400 px-2 py-1 text-right">R$ {Number(product.cost_price).toFixed(2)}</td>
                      <td className="border border-slate-400 px-2 py-1 text-center font-bold">
                        {product.track_stock ? product.stock_quantity : '-'} {product.unit}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-center text-slate-500">
                        {product.track_stock ? product.min_stock_quantity : '-'}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-center">
                        {product.track_stock ? (
                          isLow ? <span className="text-red-600 font-bold">BAIXO</span> : <span className="text-green-600">OK</span>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </PrintPortal>
      )}

      {/* HEADER TELA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Gerenciamento de Estoque
          </h1>
          <p className="text-slate-500">Controle físico e produção</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handlePrint} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border" title="Imprimir"><Printer size={20} /></button>
          <button onClick={handleExportExcel} className="p-2 text-green-700 hover:bg-green-50 rounded-lg border border-green-200" title="Excel"><FileSpreadsheet size={20} /></button>
          {isManager && (
            <button onClick={() => { setProductToEdit(null); setIsProductModalOpen(true) }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
              <Plus size={20} /> Novo Produto
            </button>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        
        {/* DROPDOWN */}
        <select 
          className="p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]" 
          value={selectedCategory} 
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="Todas">Todas as Categorias</option>
          {stockCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* TABELA TELA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-print">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600 text-sm">Produto</th>
              <th className="p-4 font-semibold text-slate-600 text-sm">Categoria (Estoque)</th>
              <th className="p-4 font-semibold text-slate-600 text-sm text-right">Custo</th>
              <th className="p-4 font-semibold text-slate-600 text-sm text-center">Nível</th>
              <th className="p-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map(product => {
              const isLowStock = product.track_stock && product.stock_quantity <= (product.min_stock_quantity || 0)
              
              const isWip = product.type === 'wip'
              const isResaleCategory = ['Bebidas', 'Tabacaria', 'Mercearia', 'Bomboniere', 'Revenda'].includes(product.stock_category)
              const isSaleWithProduction = product.type === 'sale' && !isResaleCategory
              
              const showProduction = isWip || isSaleWithProduction

              return (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{product.name}</div>
                    {product.barcode && <div className="text-xs text-slate-400">{product.barcode}</div>}
                  </td>
                  
                  <td className="p-4">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100">
                      {product.stock_category || 'Geral'}
                    </span>
                  </td>

                  <td className="p-4 text-right font-medium text-slate-600">
                    R$ {Number(product.cost_price || 0).toFixed(2)}
                  </td>

                  <td className="p-4">
                    {!product.track_stock ? (
                      <div className="text-center text-slate-400 text-sm italic">--</div>
                    ) : (
                      <div className="flex flex-col items-center w-full max-w-[120px] mx-auto">
                        <div className="flex items-center justify-between w-full text-xs mb-1">
                           <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                             {product.stock_quantity} <span className="text-slate-400 font-normal">{product.unit || 'un'}</span>
                           </span>
                           {isLowStock && <AlertTriangle size={12} className="text-red-500" />}
                        </div>
                        <StockLevelBar current={product.stock_quantity} min={product.min_stock_quantity} />
                      </div>
                    )}
                  </td>

                  {/* AÇÕES */}
                  <td className="p-4 text-right flex justify-end items-center gap-1">
                    
                    {showProduction && (
                      <>
                        <button onClick={() => setSelectedProductForRecipe(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ficha Técnica">
                          <ClipboardList size={18} />
                        </button>
                        <button onClick={() => setSelectedProductForProduction(product)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Produzir">
                          <ChefHat size={18} />
                        </button>
                      </>
                    )}

                    {isManager && product.track_stock && (
                       <button onClick={() => setSelectedProductForAdjustment(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ajustar Estoque">
                         <ArrowRightLeft size={18} />
                       </button>
                    )}

                    {isManager && (
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === product.id ? null : product.id) }}
                          className="p-2 hover:bg-slate-200 rounded text-slate-500"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {menuOpenId === product.id && (
                          <div className="absolute right-0 top-10 w-40 bg-white shadow-xl rounded-lg border border-slate-100 z-50 overflow-hidden">
                            <button onClick={() => { setProductToEdit(product); setIsProductModalOpen(true) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                              <Pencil size={14} className="mr-2"/> Editar
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center border-t border-slate-50">
                              <Trash2 size={14} className="mr-2"/> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODAIS --- */}
      {isProductModalOpen && <NewProductModal onClose={() => setIsProductModalOpen(false)} onSave={handleSaveProduct} productToEdit={productToEdit} />}
      {selectedProductForRecipe && <RecipeModal isOpen={!!selectedProductForRecipe} product={selectedProductForRecipe} onClose={() => setSelectedProductForRecipe(null)} />}
      {selectedProductForAdjustment && <StockAdjustmentModal isOpen={!!selectedProductForAdjustment} product={selectedProductForAdjustment} onClose={() => setSelectedProductForAdjustment(null)} onConfirm={fetchProducts} />}
      {selectedProductForProduction && <ProductionModal isOpen={!!selectedProductForProduction} product={selectedProductForProduction} onClose={() => setSelectedProductForProduction(null)} onConfirm={fetchProducts} />}
      
    </div>
  )
}