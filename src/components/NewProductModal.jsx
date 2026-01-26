import { useState, useEffect } from 'react'
import { X, Loader2, Save, ScanBarcode, Layers, PieChart, Package, Plus, RotateCcw, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function NewProductModal({ onClose, onSave, productToEdit }) {
  const [activeTab, setActiveTab] = useState('geral') // 'geral' | 'fiscal'
  
  // Listas Oficiais
  const [categoriesPDV, setCategoriesPDV] = useState([])
  const [categoriesStock, setCategoriesStock] = useState([])
  const [financialGroups, setFinancialGroups] = useState([])
  const [units, setUnits] = useState([])
  
  const [isSaving, setIsSaving] = useState(false)
  
  // Controle de Criação Inline
  const [isCreatingPDV, setIsCreatingPDV] = useState(false)
  const [newPDVName, setNewPDVName] = useState('')

  const [isCreatingStock, setIsCreatingStock] = useState(false)
  const [newStockName, setNewStockName] = useState('')

  // NOVO: Controle de Criação Inline - Grupo Financeiro
  const [isCreatingFinancial, setIsCreatingFinancial] = useState(false)
  const [newFinancialName, setNewFinancialName] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    type: 'sale',           
    category_id: '',        
    stock_category: '', 
    financial_group: '', 
    price: '',
    cost_price: '',
    unit: 'un',
    stock_quantity: '',
    min_stock_quantity: '',
    destination: 'cozinha',
    track_stock: true,
    // NOVOS CAMPOS FISCAIS
    ncm: '',
    cest: '',
    cfop: '5102', // Padrão Venda
    origin: '0'   // 0 - Nacional
  })

  useEffect(() => {
    const loadInitialData = async () => {
      const { data: catPDV } = await supabase.from('categories').select('*').order('name')
      const { data: catStock } = await supabase.from('stock_categories_list').select('*').order('name')
      const { data: finGroups } = await supabase.from('financial_groups_list').select('*').order('name')
      const { data: unitsList } = await supabase.from('units_list').select('*').order('name')

      setCategoriesPDV(catPDV || [])
      setCategoriesStock(catStock || [])
      setFinancialGroups(finGroups || [])
      setUnits(unitsList || [])

      if (productToEdit) {
        setFormData({
          name: productToEdit.name,
          barcode: productToEdit.barcode || '',
          type: productToEdit.type,
          category_id: productToEdit.category_id || '',
          stock_category: productToEdit.stock_category || '',
          financial_group: productToEdit.financial_group || '', 
          price: productToEdit.price,
          cost_price: productToEdit.cost_price || 0,
          unit: productToEdit.unit,
          stock_quantity: productToEdit.stock_quantity,
          min_stock_quantity: productToEdit.min_stock_quantity || 5,
          destination: productToEdit.destination || 'cozinha',
          track_stock: productToEdit.track_stock,
          // Carrega fiscais ou usa padrão
          ncm: productToEdit.ncm || '',
          cest: productToEdit.cest || '',
          cfop: productToEdit.cfop || '5102',
          origin: productToEdit.origin || '0'
        })
      } else {
        if (finGroups?.length > 0) setFormData(prev => ({...prev, financial_group: finGroups[0].name}))
      }
    }

    loadInitialData()
  }, [productToEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      let finalCategoryId = formData.category_id === '' ? null : formData.category_id
      let finalStockCategory = formData.stock_category
      let finalFinancialGroup = formData.financial_group

      // Lógica de Criação Inline (PDV e Estoque)
      if (isCreatingPDV && newPDVName.trim()) {
        const { data: newCat, error } = await supabase.from('categories').insert({ name: newPDVName.trim() }).select().single()
        if (error) throw error
        finalCategoryId = newCat.id
      }

      if (isCreatingStock && newStockName.trim()) {
        finalStockCategory = newStockName.trim()
        const { error } = await supabase.from('stock_categories_list').insert({ name: finalStockCategory }).select()
        if (error && error.code !== '23505') console.error(error) 
      }

      // NOVO: Lógica de Criação Inline (Grupo Financeiro)
      if (isCreatingFinancial && newFinancialName.trim()) {
        finalFinancialGroup = newFinancialName.trim()
        const { error } = await supabase.from('financial_groups_list').insert({ name: finalFinancialGroup }).select()
        if (error && error.code !== '23505') console.error(error)
      }

      const payload = {
        ...formData,
        category_id: finalCategoryId,
        stock_category: finalStockCategory,
        financial_group: finalFinancialGroup,
        price: parseFloat(formData.price || 0),
        cost_price: parseFloat(formData.cost_price || 0),
        stock_quantity: parseFloat(formData.stock_quantity || 0),
        min_stock_quantity: parseFloat(formData.min_stock_quantity || 0),
      }

      if (productToEdit) {
        await onSave({ ...payload, id: productToEdit.id })
      } else {
        await onSave(payload)
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao salvar.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col max-h-[95vh]">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {productToEdit ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex border-b border-slate-200 px-6">
          <button 
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Dados Gerais
          </button>
          <button 
            onClick={() => setActiveTab('fiscal')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'fiscal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={16}/> Fiscal (NFe/NFCe)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* --- ABA GERAL --- */}
          <div className={activeTab === 'geral' ? 'block space-y-6' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="label">Nome do Produto</label>
                <input name="name" required value={formData.name} onChange={handleChange} placeholder="Ex: Arroz Branco" className="input-base" />
              </div>
              <div className="md:col-span-3">
                <label className="label">Código de Barras</label>
                <div className="relative">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input name="barcode" value={formData.barcode} onChange={handleChange} className="input-base pl-10" />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="label text-blue-700">Tipo</label>
                <select name="type" value={formData.type} onChange={handleChange} className="input-base bg-blue-50 border-blue-200 font-medium">
                  <option value="sale">Venda</option>
                  <option value="raw">Matéria Prima</option>
                  <option value="wip">Preparo</option>
                </select>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* CATEGORIAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PDV */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                <label className="label flex items-center gap-1 text-slate-700"><Layers size={14}/> Categoria PDV</label>
                {isCreatingPDV ? (
                  <div className="flex gap-2 animate-fade-in">
                    <input autoFocus value={newPDVName} onChange={e => setNewPDVName(e.target.value)} placeholder="Nova..." className="input-base text-sm py-2 px-2" />
                    <button type="button" onClick={() => setIsCreatingPDV(false)} className="p-2 bg-slate-100 rounded"><RotateCcw size={18}/></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select name="category_id" value={formData.category_id} onChange={handleChange} className="input-base text-sm py-2 px-2">
                      <option value="">-- Oculto no menu --</option>
                      {categoriesPDV.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsCreatingPDV(true)} className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100"><Plus size={18}/></button>
                  </div>
                )}
              </div>

              {/* ESTOQUE */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                <label className="label flex items-center gap-1 text-slate-700"><Package size={14}/> Categoria Estoque</label>
                {isCreatingStock ? (
                  <div className="flex gap-2 animate-fade-in">
                    <input autoFocus value={newStockName} onChange={e => setNewStockName(e.target.value)} placeholder="Nova..." className="input-base text-sm py-2 px-2" />
                    <button type="button" onClick={() => setIsCreatingStock(false)} className="p-2 bg-slate-100 rounded"><RotateCcw size={18}/></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select name="stock_category" value={formData.stock_category} onChange={handleChange} className="input-base text-sm py-2 px-2">
                      <option value="">Selecione...</option>
                      {categoriesStock.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsCreatingStock(true)} className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100"><Plus size={18}/></button>
                  </div>
                )}
              </div>

              {/* FINANCEIRO - COM FUNCIONALIDADE ADICIONADA */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                <label className="label flex items-center gap-1 text-slate-700"><PieChart size={14}/> Grupo Financeiro</label>
                {isCreatingFinancial ? (
                  <div className="flex gap-2 animate-fade-in">
                    <input autoFocus value={newFinancialName} onChange={e => setNewFinancialName(e.target.value)} placeholder="Novo..." className="input-base text-sm py-2 px-2" />
                    <button type="button" onClick={() => setIsCreatingFinancial(false)} className="p-2 bg-slate-100 rounded"><RotateCcw size={18}/></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select name="financial_group" value={formData.financial_group} onChange={handleChange} className="input-base text-sm py-2 px-2">
                      <option value="">Selecione...</option>
                      {financialGroups.map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsCreatingFinancial(true)} className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100"><Plus size={18}/></button>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* PREÇOS E UNIDADES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Preço Venda</label>
                <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} disabled={formData.type === 'raw'} className="input-base font-bold disabled:bg-slate-100" />
              </div>
              <div>
                <label className="label">Custo Unitário</label>
                <input name="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={handleChange} className="input-base" />
              </div>
              <div>
                <label className="label">Unidade</label>
                <select name="unit" value={formData.unit} onChange={handleChange} className="input-base bg-white">
                  {units.map(u => <option key={u.id} value={u.symbol}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>
              {formData.type === 'sale' && (
                <div>
                  <label className="label">Destino (KDS)</label>
                  <select name="destination" value={formData.destination} onChange={handleChange} className="input-base bg-white text-sm">
                    <option value="cozinha">Cozinha</option>
                    <option value="bar">Bar</option>
                    <option value="nenhum">Nenhum</option>
                  </select>
                </div>
              )}
            </div>

            {/* ESTOQUE CHECKBOX - PRESERVADO */}
            {formData.type !== 'servico' && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex items-center mb-3">
                  <input type="checkbox" name="track_stock" checked={formData.track_stock} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                  <label className="ml-2 text-sm font-medium text-slate-700">Controlar Estoque?</label>
                </div>
                {formData.track_stock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Atual</label><input name="stock_quantity" type="number" value={formData.stock_quantity} onChange={handleChange} className="input-base" /></div>
                    <div><label className="label">Mínimo</label><input name="min_stock_quantity" type="number" value={formData.min_stock_quantity} onChange={handleChange} className="input-base" /></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- ABA FISCAL --- */}
          <div className={activeTab === 'fiscal' ? 'block space-y-6' : 'hidden'}>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Atenção:</strong> Estes dados são obrigatórios para a emissão de nota fiscal (NFC-e/NF-e).
                Consulte seu contador para saber os códigos corretos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">NCM (Obrigatório)</label>
                <input 
                  name="ncm" 
                  value={formData.ncm} 
                  onChange={handleChange} 
                  placeholder="Ex: 2106.90.90" 
                  className="input-base font-mono" 
                  maxLength={10}
                />
                <p className="text-[10px] text-slate-400 mt-1">Nomenclatura Comum do Mercosul</p>
              </div>

              <div>
                <label className="label">CEST</label>
                <input 
                  name="cest" 
                  value={formData.cest} 
                  onChange={handleChange} 
                  placeholder="Ex: 01.001.00" 
                  className="input-base font-mono" 
                  maxLength={10}
                />
                <p className="text-[10px] text-slate-400 mt-1">Código Especificador da Substituição Tributária</p>
              </div>

              <div>
                <label className="label">CFOP (Padrão: 5.102)</label>
                <input 
                  name="cfop" 
                  value={formData.cfop} 
                  onChange={handleChange} 
                  placeholder="5102" 
                  className="input-base font-mono" 
                  maxLength={4}
                />
                <p className="text-[10px] text-slate-400 mt-1">Código Fiscal de Operações</p>
              </div>

              <div>
                <label className="label">Origem da Mercadoria</label>
                <select name="origin" value={formData.origin} onChange={handleChange} className="input-base bg-white">
                  <option value="0">0 - Nacional</option>
                  <option value="1">1 - Estrangeira (Imp. Direta)</option>
                  <option value="2">2 - Estrangeira (Adq. no Brasil)</option>
                </select>
              </div>
            </div>
          </div>

        </form>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center shadow-lg">
            {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={18} className="mr-2"/> Salvar</>}
          </button>
        </div>

      </div>
    </div>
  )
}