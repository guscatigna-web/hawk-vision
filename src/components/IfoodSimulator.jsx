import { useState, useEffect } from 'react'
import { CloudLightning, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { PrintPortal, PreBillTicket, KitchenTicket } from './Receipts' 

export function IfoodSimulator() {
  const [loading, setLoading] = useState(false)
  
  // Estado para controlar QUAL tipo de impressão faremos
  const [printData, setPrintData] = useState(null)
  const [printType, setPrintType] = useState(null) // 'expedition', 'kitchen' ou 'combo'

  // --- O VIGILANTE DE IMPRESSÃO ---
  useEffect(() => {
    if (printData && printType) {
      console.log(`🖨️ Imprimindo modo: ${printType}`, printData)
      
      const timer = setTimeout(() => {
        window.print()
        // Limpa estado após impressão
        setTimeout(() => {
            setPrintData(null)
            setPrintType(null)
        }, 2000)
      }, 800) 
      
      return () => clearTimeout(timer)
    }
  }, [printData, printType])

  const handleSimulateOrder = async () => {
    setLoading(true)
    const toastId = toast.loading('Recebendo pedido iFood...')

    try {
      // 1. CHECAR MODO DE OPERAÇÃO
      const useKDS = localStorage.getItem('hawk_use_kds') === 'true'

      // 2. DADOS DE AUTENTICAÇÃO
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário off-line')

      const { data: emp } = await supabase
        .from('employees')
        .select('company_id')
        .eq('email', user.email)
        .single()
      
      if (!emp) throw new Error('Empresa não encontrada')
      const companyId = emp.company_id

      // 3. DADOS DA EMPRESA E CONFIG
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', companyId)
        .maybeSingle()

      const { data: config } = await supabase
        .from('integrations_ifood')
        .select('auto_accept, auto_print')
        .eq('company_id', companyId)
        .single()

      // 4. LÓGICA DE FLUXO
      let initialStatus
      let targetPrintType
      const userWantsPrint = config?.auto_print ?? true

      if (useKDS) {
          // MODO KDS: Tela + Expedição (Opcional)
          initialStatus = config?.auto_accept ? 'preparing' : 'pending'
          targetPrintType = userWantsPrint ? 'expedition' : null
      } else {
          // MODO IMPRESSORA: Limpa Tela + Imprime TUDO (Combo)
          initialStatus = 'delivered'
          targetPrintType = 'combo' 
      }
      
      // 5. CLIENTE FAKE
      const orderNumber = Math.floor(1000 + Math.random() * 9000)
      const fakeCustomer = {
        name: `Gustavo Scatigna (iFood)`,
        phone: '(31) 99999-9999',
        address: 'Av. Afonso Pena, 1500',
        neighborhood: 'Centro',
        city: 'Belo Horizonte - MG',
        complement: 'Apto 101 - Portaria 2'
      }

      // 6. PRODUTOS (BUSCA INTELIGENTE COM JOIN DE CATEGORIA)
      // Aqui está o segredo: buscamos o 'categories(name)' para saber se é Bebida ou Comida de verdade
      
      let item1, item2;

      // Busca Prato
      const { data: foundPF } = await supabase
        .from('products')
        .select('*, categories(id, name)') // Trazemos a categoria real
        .ilike('name', '%Prato%')
        .limit(1)
        .maybeSingle()

      // Busca Bebida
      const { data: foundCoke } = await supabase
        .from('products')
        .select('*, categories(id, name)') // Trazemos a categoria real
        .ilike('name', '%Coca%')
        .limit(1)
        .maybeSingle()

      // Fallback: Se não achar no banco, criamos objetos COM a estrutura de categoria correta
      item1 = foundPF || { 
          id: 1001, name: 'Prato Feito da Casa (Simulado)', price: 25.90, 
          categories: { name: 'Refeições', id: 1 } 
      }
      item2 = foundCoke || { 
          id: 1002, name: 'Coca-Cola Lata (Simulado)', price: 6.00, 
          categories: { name: 'Bebidas', id: 2 } // Nome 'Bebidas' é crucial para o filtro do KitchenTicket
      }

      const totalOrder = item1.price + item2.price + 5.99

      // 7. INSERIR A VENDA
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: companyId,
          customer_name: fakeCustomer.name,
          status: 'aberto',
          total: totalOrder,
          payment_method: 'iFood Online',
          channel: 'iFood',
          ifood_order_id: `key-${orderNumber}`,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (saleError) throw new Error(saleError.message)

      // 8. INSERIR OS ITENS
      const items = [
        { 
            company_id: companyId, sale_id: saleData.id, 
            product_id: item1.id, product_name: item1.name, 
            quantity: 1, unit_price: item1.price, total: item1.price,
            status: initialStatus 
        },
        { 
            company_id: companyId, sale_id: saleData.id, 
            product_id: item2.id, product_name: item2.name, 
            quantity: 1, unit_price: item2.price, total: item2.price,
            status: initialStatus
        }
      ]

      const { error: itemsError } = await supabase.from('sale_items').insert(items)
      if (itemsError) throw new Error(itemsError.message)

      // 9. SOM
      try {
        const audio = new Audio('/notification.mp3') 
        audio.play().catch(() => {}) 
      } catch (audioError) { console.warn(audioError) }

      toast.success(`🔔 Pedido #${orderNumber} Recebido!`, { id: toastId })

      // 10. MONTAR DADOS PARA IMPRESSÃO
      // Agora usamos os dados reais do produto (item1 e item2) que já contêm a categoria correta
      if (targetPrintType) {
        
        const ticketData = {
           company: {
               company_name: companySettings?.company_name || "Hawk Vision Delivery",
               cnpj: companySettings?.cnpj || "00.000.000/0001-00",
               address: companySettings?.address || "Rua do Comércio, 123"
           },
           table_number: 'DELIVERY', 
           waiter_name: 'iFood App',
           customer_name: fakeCustomer.name,
           customer_address: `${fakeCustomer.address} - ${fakeCustomer.neighborhood}`,
           customer_obs: fakeCustomer.complement,
           created_at: new Date(),
           order_id: orderNumber,
           subtotal: item1.price + item2.price,
           total: totalOrder,
           
           // AQUI A MÁGICA: Repassamos a estrutura 'product.categories' para o componente de impressão
           items: [
               { ...items[0], product: item1 }, // Item 1 completo (com categoria)
               { ...items[1], product: item2 }  // Item 2 completo (com categoria)
           ]
        }
        
        setPrintType(targetPrintType)
        setPrintData(ticketData)
      }

    } catch (error) {
      console.error('Erro simulator:', error)
      toast.error(`Erro: ${error.message}`, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleSimulateOrder}
        disabled={loading}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#EA1D2C] hover:bg-[#b91522] text-white p-4 rounded-full shadow-lg shadow-red-900/50 transition-all active:scale-95 group border-2 border-white/20"
      >
        {loading ? (
          <Loader2 className="animate-spin h-6 w-6" />
        ) : (
          <>
            <CloudLightning className="h-6 w-6" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap pl-0 group-hover:pl-2">
              Simular iFood
            </span>
          </>
        )}
      </button>

      {/* --- PORTAL DE IMPRESSÃO --- */}
      {printData && (
        <PrintPortal>
            
            {/* TIPO 1: EXPEDIÇÃO (Modo KDS) */}
            {printType === 'expedition' && (
                <PreBillTicket 
                    order={printData} 
                    subtotal={printData.subtotal} 
                    total={printData.total}
                    company={printData.company} 
                />
            )}

            {/* TIPO 2: COMBO COMPLETO (Modo Impressora) */}
            {printType === 'combo' && (
                <>
                    {/* 1. Via de Conferência */}
                    <PreBillTicket 
                        order={printData} 
                        subtotal={printData.subtotal} 
                        total={printData.total}
                        company={printData.company} 
                    />
                    
                    <div className="page-break"></div>

                    {/* 2. Via de Cozinha (Filtrada automaticamente pela categoria real) */}
                    <KitchenTicket order={printData} station="Cozinha" />
                    
                    <div className="page-break"></div>

                    {/* 3. Via de Bar (Filtrada automaticamente pela categoria real) */}
                    <KitchenTicket order={printData} station="Bar" />
                </>
            )}

        </PrintPortal>
      )}
    </>
  )
}