import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, Loader2, ScanBarcode, ChefHat, Receipt, ArrowLeft, Printer, Monitor, FileText, User, Tag, Wallet, X, Check, Settings, Utensils, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCashier } from '../contexts/CashierContext'
import { CashierControl } from '../components/CashierControl'
import { PrintPortal, KitchenTicket, PreBillTicket, CustomerReceipt } from '../components/Receipts' 
import { SaleSuccessModal } from '../components/SaleSuccessModal' 
// COMPONENTES EXTERNOS
import { PaymentModal } from '../components/PaymentModal'
import { DiscountModal } from '../components/DiscountModal'
import { AuthModal } from '../components/AuthModal' 
import { FiscalService } from '../services/FiscalService' 
import toast from 'react-hot-toast'

export function Vendas() {
  const { user } = useAuth()
  const { currentSession, addTransaction } = useCashier()
  const navigate = useNavigate()
  
  const [searchParams] = useSearchParams()
  const searchInputRef = useRef(null)

  const tableNumberParam = searchParams.get('mesa')
  const saleIdParam = searchParams.get('saleId')
  const isRestaurantMode = !!tableNumberParam
  const isExpressSession = currentSession?.type === 'express'

  // --- CONFIGURAÇÕES DE FLUXO ---
  const [useKDS, setUseKDS] = useState(() => localStorage.getItem('hawk_use_kds') === 'true')
  const [autoDeliver, setAutoDeliver] = useState(() => {
    const saved = localStorage.getItem('hawk_auto_deliver')
    return saved === null ? true : saved === 'true'
  })

  // Leitura da configuração de confirmação
  const [askRelease] = useState(() => {
    const saved = localStorage.getItem('hawk_ask_table_release')
    return saved === null ? true : saved === 'true'
  })

  const toggleKDSMode = () => {
    const newValue = !useKDS
    setUseKDS(newValue)
    localStorage.setItem('hawk_use_kds', newValue)
    toast(newValue ? "Modo KDS Ativado" : "Modo Impressora Ativado")
  }

  const toggleAutoDeliver = () => {
    const newValue = !autoDeliver
    setAutoDeliver(newValue)
    localStorage.setItem('hawk_auto_deliver', newValue)
    toast(newValue ? "Modo Restaurante Ativado" : "Modo Fast-Food Ativado")
  }

  // --- CONTROLE DE IMPRESSÃO E MODAL ---
  const [printData, setPrintData] = useState(null) 
  const [printType, setPrintType] = useState(null) 
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastSaleData, setLastSaleData] = useState(null) 
  const [companyInfo, setCompanyInfo] = useState(null)

  // --- CONTROLE DE AUTORIZAÇÃO ---
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) 

  // Estados de Dados
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [discountsList, setDiscountsList] = useState([]) 
  const [loading, setLoading] = useState(true)
  
  // Carrinho e Venda
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([]) 
  const [existingItems, setExistingItems] = useState([]) 
  const [existingTotal, setExistingTotal] = useState(0)
  const [currentSaleId, setCurrentSaleId] = useState(saleIdParam || null)

  // Dados do Cliente e Pagamento
  const [customerName, setCustomerName] = useState('')
  const [customerDoc, setCustomerDoc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // --- ESTADOS DE PAGAMENTO AVANÇADO ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  
  const [payments, setPayments] = useState([]) 
  const [discount, setDiscount] = useState({ type: 'fixed', value: 0, reason: '' }) 
  const [includeServiceFee, setIncludeServiceFee] = useState(true)

  // Busca inicial
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: prodData } = await supabase.from('products').select('*, categories(name)').eq('type', 'sale').order('name')
        const { data: catData } = await supabase.from('categories').select('*').order('name')
        const { data: companyData } = await supabase.from('company_settings').select('*').single()
        const { data: discData } = await supabase.from('discounts_config').select('*').eq('active', true)
        
        setProducts(prodData || [])
        setCategories(catData || [])
        setCompanyInfo(companyData)
        setDiscountsList(discData || [])
      } catch (error) { console.error(error) } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const fetchPayments = useCallback(async (saleId) => {
    if (!saleId) {
        setPayments([])
        return
    }
    const { data } = await supabase.from('sale_payments').select('*').eq('sale_id', saleId)
    setPayments(data || [])
  }, [])

  const fetchExistingSaleItems = useCallback(async (saleId) => {
    const { data } = await supabase.from('sale_items').select('*, product:products(*)').eq('sale_id', saleId)
    setExistingItems(data || [])
    
    // Calcula o total dos itens salvos
    const total = data?.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) || 0
    setExistingTotal(total)
    
    // Se a venda existe, busca os pagamentos também
    if (saleId) fetchPayments(saleId)
  }, [fetchPayments])

  useEffect(() => {
    if (saleIdParam) { setCurrentSaleId(saleIdParam); fetchExistingSaleItems(saleIdParam); }
    if (isRestaurantMode) setCustomerName(`Mesa ${tableNumberParam}`)
  }, [saleIdParam, isRestaurantMode, tableNumberParam, fetchExistingSaleItems])


  // --- CÁLCULOS TOTAIS ---
  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  const subtotalRaw = existingTotal + cartTotal
  
  const serviceFeeRate = (companyInfo?.service_fee || 10) / 100
  const serviceFeeValue = (isRestaurantMode && includeServiceFee) ? subtotalRaw * serviceFeeRate : 0
  
  const discountValue = discount.type === 'percentage' 
    ? (subtotalRaw * (discount.value / 100)) 
    : discount.value

  const grandTotalFinal = Math.max(0, subtotalRaw + serviceFeeValue - discountValue)
  
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const remainingDue = Math.max(0, grandTotalFinal - totalPaid)
  const changeDue = Math.max(0, totalPaid - grandTotalFinal)

  // --- AÇÕES DO CARRINHO ---
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (pid, delta) => {
    setCart(prev => prev.map(item => item.product.id === pid ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
  }

  // --- LÓGICA DE REMOÇÃO SEGURA ---
  const handleRemoveClick = (item, isExisting) => {
    if (!isRestaurantMode) {
      setPendingAction({ type: 'delete_cart', data: item })
      setAuthModalOpen(true)
      return
    }

    if (isRestaurantMode) {
      if (isExisting) {
        setPendingAction({ type: 'delete_server', data: item })
        setAuthModalOpen(true)
      } else {
        setCart(prev => prev.filter(i => i.product.id !== item.product.id))
      }
    }
  }

  const executePendingAction = async (approver) => {
    if (!pendingAction) return

    if (pendingAction.type === 'delete_cart') {
      setCart(prev => prev.filter(item => item.product.id !== pendingAction.data.product.id))
      toast.success(`Item removido (Aut: ${approver.name.split(' ')[0]})`)
    }

    if (pendingAction.type === 'delete_server') {
      try {
        await supabase.from('sale_items').delete().eq('id', pendingAction.data.id)
        await fetchExistingSaleItems(currentSaleId) 
        toast.success(`Cancelado (Aut: ${approver.name.split(' ')[0]})`)
      } catch (error) {
        console.error(error)
        toast.error("Erro ao cancelar item")
      }
    }

    setPendingAction(null)
  }

  // --- FUNÇÕES DE IMPRESSÃO ---
  const handlePrint = (type, data) => {
    setPrintType(type)
    setPrintData(data)
    setTimeout(() => window.print(), 300)
  }

  const handlePrintPreBill = () => {
    const allItems = [...existingItems, ...cart] 
    if (allItems.length === 0) return toast.error("Nada para imprimir.")
    const data = {
      customer_name: customerName || 'Mesa/Cliente',
      items: allItems,
      waiter_name: user?.name || 'Garçom',
      table_number: tableNumberParam
    }
    handlePrint('prebill', data)
  }

  // --- KDS ---
  const handleSendOrder = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio!")
    if (!currentSession) return toast.error("Abra o caixa antes de lançar!") 

    setIsProcessing(true)
    try {
      let activeId = currentSaleId
      if (!activeId) {
        const { data: newSale, error } = await supabase.from('sales').insert({
            employee_id: user.id, 
            customer_name: customerName || 'Balcão', 
            table_number: tableNumberParam ? parseInt(tableNumberParam) : null, 
            status: 'aberto', 
            total: 0,
            cashier_session_id: currentSession.id // VINCULA AO CAIXA
          }).select().single()
        
        if (error) throw error
        activeId = newSale.id
        setCurrentSaleId(newSale.id)
      }

      const initialStatus = useKDS ? 'pending' : 'delivered' 
      const itemsToInsert = cart.map(item => ({
        sale_id: activeId, product_id: item.product.id, quantity: item.quantity, unit_price: item.product.price, status: initialStatus
      }))
      await supabase.from('sale_items').insert(itemsToInsert)
      await supabase.from('sales').update({ total: subtotalRaw, status: 'aberto' }).eq('id', activeId)
      
      if (useKDS) toast.success("Enviado para KDS!")
      else {
          toast.success("Imprimindo Produção...")
          const printPayload = {
            id: activeId,
            customer_name: customerName || 'Balcão',
            created_at: new Date(),
            items: cart 
          }
          handlePrint('kitchen', printPayload)
      }
      setCart([]) 
      fetchExistingSaleItems(activeId) 
    } catch (error) { console.error(error); toast.error("Erro ao enviar.") } finally { setIsProcessing(false) }
  }

  // --- LÓGICA DE PAGAMENTO PERSISTENTE ---
  const handleAddPayment = async (method, amount) => {
    if (!currentSession) return toast.error("Caixa Fechado.")
    setIsProcessing(true)
    try {
        let activeId = currentSaleId

        if (!activeId) {
            const { data: newSale, error } = await supabase.from('sales').insert({
                employee_id: user.id, 
                customer_name: customerName || 'Varejo', 
                status: 'aberto', 
                total: grandTotalFinal, 
                cashier_session_id: currentSession.id
            }).select().single()
            
            if (error) throw error
            activeId = newSale.id
            setCurrentSaleId(newSale.id)

            if (cart.length > 0) {
                const initialStatus = useKDS ? 'pending' : 'delivered' 
                const itemsToInsert = cart.map(item => ({ 
                    sale_id: activeId, 
                    product_id: item.product.id, 
                    quantity: item.quantity, 
                    unit_price: item.product.price, 
                    status: initialStatus 
                }))
                await supabase.from('sale_items').insert(itemsToInsert)
                setCart([]) 
            }
        }

        await supabase.from('sale_payments').insert({
            sale_id: activeId,
            payment_method: method,
            amount: parseFloat(amount)
        })

        await addTransaction('venda', parseFloat(amount), `Parcial Venda #${activeId}`, method)

        toast.success(`Pagamento de R$ ${amount} registrado!`)
        await fetchExistingSaleItems(activeId)

    } catch (error) {
        console.error(error)
        toast.error("Erro ao registrar pagamento.")
    } finally {
        setIsProcessing(false)
    }
  }

  const handleRemovePayment = async (paymentId) => {
      if(!confirm("Remover este pagamento? O valor será estornado do caixa.")) return
      setIsProcessing(true)
      try {
          await supabase.from('sale_payments').delete().eq('id', paymentId)
          toast.success("Pagamento removido.")
          await fetchPayments(currentSaleId)
      } catch (error) {
          console.error(error)
          toast.error("Erro ao remover.")
      } finally {
          setIsProcessing(false)
      }
  }

  // --- FINALIZAÇÃO DE VENDA (INTELIGENTE - CORREÇÃO 3.1) ---
  const handleFinishSale = async () => {
    if (remainingDue > 0.01) return toast.error(`Ainda faltam R$ ${remainingDue.toFixed(2)}`)
    
    // CORREÇÃO AQUI: Removemos 'ready' da lista. Se já está pronto, não trava.
    // Só trava se estiver 'pending' (fila) ou 'preparing' (fogo).
    const hasPendingKitchenItems = existingItems.some(item => ['pending', 'preparing'].includes(item.status))
    let shouldDeliverKitchen = autoDeliver 

    if (autoDeliver && hasPendingKitchenItems && askRelease) {
        const isStandardFlow = window.confirm(
            "Finalização de Venda:\n\n" +
            "O cliente já consumiu e está liberando a mesa?\n" +
            "Clique [OK] para ENCERRAR produção na cozinha.\n" +
            "Clique [CANCELAR] se for PAGAMENTO ANTECIPADO (Manter itens na tela)."
        )
        
        if (!isStandardFlow) {
            shouldDeliverKitchen = false
            toast("Pagamento antecipado registrado. Itens mantidos na cozinha.", { icon: '👨‍🍳' })
        }
    }

    setIsProcessing(true)
    const toastId = toast.loading("Finalizando...")

    try {
      await supabase.from('sales').update({
        status: 'concluido',
        total: grandTotalFinal,
        discount_value: discountValue,
        discount_reason: discount.reason || (discountValue > 0 ? 'Manual' : null),
        customer_name: customerName || 'Varejo',
        cashier_session_id: currentSession.id,
        fiscal_status: 'pendente',
        payment_method: payments.length === 1 ? payments[0].payment_method : 'multiplo'
      }).eq('id', currentSaleId)

      await deductStock([...existingItems, ...cart])

      if (shouldDeliverKitchen) {
          await supabase.from('sale_items')
            .update({ status: 'delivered' })
            .eq('sale_id', currentSaleId)
      }

      let fiscalData = { status: 'pendente', pdf: null }
      try {
         const result = await FiscalService.emitirNFCe(currentSaleId)
         if (result.success) {
            fiscalData = { status: 'autorizado', pdf: result.pdf }
            toast.success("Nota Fiscal emitida!", { id: toastId })
         } else {
            fiscalData = { status: 'erro', message: result.error }
            toast.error("Venda salva, erro na nota.", { id: toastId })
         }
      } catch (e) { console.error(e) }

      setLastSaleData({
        id: currentSaleId,
        total: grandTotalFinal,
        change: changeDue,
        payment_method: payments.length === 1 ? payments[0].payment_method : 'Múltiplo',
        created_at: new Date(),
        items: existingItems,
        customer_doc: customerDoc,
        fiscal_status: fiscalData.status,
        fiscal_pdf: fiscalData.pdf
      })

      setIsPaymentModalOpen(false)
      setShowSuccessModal(true)

    } catch (error) {
      console.error(error)
      toast.error("Erro ao finalizar.", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const deductStock = async (itemsToDeduct) => {
    for (const item of itemsToDeduct) {
        const product = item.product
        if (product && product.track_stock) {
             const { data: currentProd } = await supabase.from('products').select('stock_quantity').eq('id', product.id).single()
             if (currentProd) {
                 await supabase.from('products').update({ stock_quantity: currentProd.stock_quantity - item.quantity }).eq('id', product.id)
             }
        }
    }
  }

  const resetScreen = () => {
    setShowSuccessModal(false)
    setPrintData(null)
    setCart([])
    setExistingItems([])
    setCurrentSaleId(null)
    setCustomerName('')
    setCustomerDoc('')
    setPayments([])
    setDiscount({ type: 'fixed', value: 0, reason: '' })
    if (isRestaurantMode) navigate('/mesas')
  }

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase()
    return (p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))) && 
           (selectedCategory === 'all' || p.category_id === parseInt(selectedCategory))
  })

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 pb-20 relative">
      
      {printData && (
        <PrintPortal>
          {printType === 'kitchen' && (
            <>
              <KitchenTicket order={printData} station="Cozinha" />
              <div className="page-break"></div>
              <KitchenTicket order={printData} station="Bar" />
            </>
          )}
          {printType === 'prebill' && <PreBillTicket order={printData} subtotal={subtotalRaw} serviceFee={serviceFeeValue} total={grandTotalFinal} company={companyInfo} />}
          {printType === 'customer' && <CustomerReceipt order={printData} company={companyInfo} />}
        </PrintPortal>
      )}

      <SaleSuccessModal 
        isOpen={showSuccessModal}
        onClose={resetScreen}
        onPrint={() => handlePrint('customer', lastSaleData)}
        change={lastSaleData?.change || 0}
        total={lastSaleData?.total || 0}
        lastSaleData={lastSaleData}
      />

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => { setAuthModalOpen(false); setPendingAction(null) }} 
        onSuccess={executePendingAction} 
        message="A exclusão deste item requer autorização de gerente."
      />

      {isPaymentModalOpen && (
        <PaymentModal 
          onClose={() => setIsPaymentModalOpen(false)}
          payments={payments}
          grandTotalFinal={grandTotalFinal}
          remainingDue={remainingDue}
          changeDue={changeDue}
          items={[...existingItems, ...cart]}
          subtotalRaw={subtotalRaw}
          serviceFeeValue={serviceFeeValue}
          discountValue={discountValue}
          discountReason={discount.reason}
          onAddPayment={handleAddPayment}
          onRemovePayment={handleRemovePayment}
          onFinishSale={handleFinishSale}
          isProcessing={isProcessing}
        />
      )}

      {isDiscountModalOpen && (
        <DiscountModal 
          onClose={() => setIsDiscountModalOpen(false)}
          discountsList={discountsList}
          setDiscount={setDiscount}
          subtotal={subtotalRaw}
        />
      )}

      {/* COLUNA ESQUERDA (CATÁLOGO) */}
      <div className="flex-1 flex flex-col gap-4">
        {isRestaurantMode && (
          <div className="flex items-center justify-between mb-[-10px]">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/mesas')} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
                <h2 className="text-xl font-bold text-slate-800">Mesa {tableNumberParam}</h2>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={toggleKDSMode} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${useKDS ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-300'}`}
                    title="Alternar entre envio para Tela (KDS) ou Impressão"
                >
                    {useKDS ? <Monitor size={14}/> : <Printer size={14}/>} {useKDS ? 'KDS' : 'Print'}
                </button>

                {/* BOTÃO FLUXO RESTAURADO: MODO RESTAURANTE vs MODO FAST-FOOD */}
                <button 
                    onClick={toggleAutoDeliver} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${autoDeliver ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}
                    title={autoDeliver ? "Fluxo Restaurante: Pagamento encerra pedido" : "Fluxo Fast-Food: Pagamento mantém pedido na tela"}
                >
                    {autoDeliver ? <Utensils size={14}/> : <Zap size={14}/>} 
                    {autoDeliver ? 'Restaurante' : 'Fast-Food'}
                </button>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              ref={searchInputRef}
              type="text" placeholder="Bipe ou busque..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{cat.name}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <button key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left flex flex-col h-full active:scale-95 duration-100 relative group">
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-700 leading-tight">{product.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 mb-2">{product.categories?.name}</p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <span className="font-bold text-slate-800 text-lg">R$ {product.price.toFixed(2)}</span>
                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={16}/></div>
                    </div>
                </button>
              ))}
             </div>
        </div>
      </div>

      {/* COLUNA DIREITA (CARRINHO) */}
      <div className="w-96 bg-white rounded-xl shadow-lg border border-slate-100 flex flex-col h-full z-10">
        <div className={`p-5 border-b border-slate-100 rounded-t-xl flex justify-between items-center ${isRestaurantMode ? 'bg-amber-50' : 'bg-slate-50'}`}>
             <h2 className={`font-bold flex items-center gap-2 ${isRestaurantMode ? 'text-amber-800' : 'text-slate-800'}`}>
                {isRestaurantMode ? <Receipt size={20} /> : <ShoppingCart size={20} />} 
                {isRestaurantMode ? `Comanda` : 'Carrinho'}
             </h2>
             <span className="text-xs font-bold bg-white px-2 py-1 rounded-full border border-slate-200">
                {isRestaurantMode ? existingItems.length + cart.length : cart.length} itens
             </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {isRestaurantMode && existingItems.length > 0 && (
                <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Já Enviado</p>
                <div className="space-y-2">
                    {existingItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-200 group">
                        <div className="text-sm opacity-70"><span className="font-bold mr-2">{item.quantity}x</span> {item.product.name}</div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs font-bold opacity-70">R$ {(item.quantity * item.unit_price).toFixed(2)}</div>
                            <button onClick={() => handleRemoveClick(item, true)} className="text-red-300 hover:text-red-500 p-1 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 size={14}/></button>
                        </div>
                    </div>
                    ))}
                </div>
                <div className="border-b border-slate-200 my-4"></div>
                </div>
            )}

            {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm animate-fade-in-right">
                    <div>
                        <p className="font-bold text-sm text-slate-700">{item.product.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} x R$ {item.product.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-slate-100 rounded"><Minus size={14}/></button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-slate-100 rounded"><Plus size={14}/></button>
                        <button onClick={() => handleRemoveClick(item, false)} className="text-red-400 ml-2 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-5 border-t border-slate-100 bg-white rounded-b-xl shadow-upper">
          <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="CPF/CNPJ na nota..." 
                      value={customerDoc}
                      onChange={e => setCustomerDoc(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
              </div>
          </div>

          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-700">R$ {subtotalRaw.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm items-center">
                 <button onClick={() => setIsDiscountModalOpen(true)} className="text-xs px-2 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600 transition-colors flex items-center gap-1">
                    <Tag size={12}/> {discountValue > 0 ? 'Alterar Desconto' : 'Adicionar Desconto'}
                 </button>
                 <span className={discountValue > 0 ? "text-red-500 font-bold" : "text-slate-300"}>
                    {discountValue > 0 ? `- R$ ${discountValue.toFixed(2)}` : '--'}
                 </span>
            </div>

            {isRestaurantMode && (
               <div className="flex justify-between text-sm items-center mt-1">
                 {/* BOTÃO ATUALIZADO: LÊ A TAXA DO ESTADO */}
                 <button onClick={() => setIncludeServiceFee(!includeServiceFee)} className={`text-xs px-2 py-0.5 rounded border transition-colors ${includeServiceFee ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    Taxa Serviço ({companyInfo?.service_fee || 10}%)
                 </button>
                 <span className={includeServiceFee ? "text-green-600 font-bold" : "text-slate-300 line-through"}>R$ {serviceFeeValue.toFixed(2)}</span>
               </div>
            )}
            
            <div className="flex justify-between items-end pt-2 border-t border-slate-50 mt-2">
              <span className="text-slate-800 font-bold text-lg">Total</span>
              <span className="text-2xl font-bold text-slate-900">R$ {grandTotalFinal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4">
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={isExpressSession && cart.length === 0} 
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Wallet size={24}/>
              REALIZAR PAGAMENTO
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            {isRestaurantMode && (
              <div className="flex-1 flex gap-2">
                 <button 
                    onClick={handlePrintPreBill}
                    disabled={existingItems.length === 0 && cart.length === 0}
                    className="px-3 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                    title="Imprimir Conferência"
                 >
                    <FileText size={20} />
                 </button>

                 <button 
                    onClick={handleSendOrder}
                    disabled={isProcessing || cart.length === 0}
                    className={`flex-1 text-white py-3 rounded-xl font-bold flex flex-col items-center justify-center transition-colors disabled:opacity-50 ${useKDS ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-700 hover:bg-slate-800'}`}
                 >
                    <div className="flex items-center text-sm">
                        {useKDS ? <ChefHat size={16} className="mr-1"/> : <Printer size={16} className="mr-1"/>} 
                        {useKDS ? 'Enviar' : 'Imprimir'}
                    </div>
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <CashierControl />
    </div>
  )
}

function PaymentMethodBtn({ icon, label, onClick, color }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 ${color}`}>
      <div className="mb-1 scale-125">{icon}</div>
      <span className="font-bold text-xs uppercase">{label}</span>
    </button>
  )
}