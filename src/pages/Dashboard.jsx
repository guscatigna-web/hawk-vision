import { useEffect, useState } from 'react'
import { DollarSign, Users, AlertTriangle, ShoppingBag, TrendingUp, Printer, CreditCard, ArrowUpRight } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { supabase } from '../lib/supabase' 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { PrintPortal, CustomerReceipt } from '../components/Receipts' // NOVO: Usa o Portal
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const navigate = useNavigate()
  
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    ticketMedio: 0,
    openOrders: 0,
    lowStockCount: 0,
    activeCashiers: 0
  })
  
  const [chartsData, setChartsData] = useState({
    salesByHour: [],
    paymentMethods: [],
    topProducts: []
  })

  const [loading, setLoading] = useState(true)
  const [printingOrder, setPrintingOrder] = useState(null)

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchDashboardData() {
    try {
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      // 1. BUSCA VENDAS DO DIA
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total, created_at, status, payment_method')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        
      if (salesError) throw salesError

      const completedSales = salesData.filter(sale => sale.status === 'concluido')
      
      // Faturamento e Ticket Médio
      const todayRevenue = completedSales.reduce((acc, curr) => acc + (curr.total || 0), 0)
      const ticketMedio = completedSales.length > 0 ? todayRevenue / completedSales.length : 0

      // Processamento para Gráficos
      const hoursMap = {}
      const paymentsMap = {}

      completedSales.forEach(sale => {
        const hour = new Date(sale.created_at).getHours()
        hoursMap[hour] = (hoursMap[hour] || 0) + sale.total

        const method = sale.payment_method || 'Outros'
        paymentsMap[method] = (paymentsMap[method] || 0) + sale.total
      })
      
      const salesByHour = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}h`,
        valor: hoursMap[i] || 0
      }))

      const paymentMethods = Object.keys(paymentsMap).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: paymentsMap[key]
      }))

      // 2. PEDIDOS ABERTOS
      const { count: openOrders } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .in('status', ['aberto', 'preparando', 'pronto'])

      // 3. ALERTAS DE ESTOQUE
      const { data: productsData } = await supabase
        .from('products')
        .select('track_stock, stock_quantity, min_stock_quantity')
        .eq('track_stock', true)

      const lowStockCount = productsData 
        ? productsData.filter(p => p.stock_quantity <= (p.min_stock_quantity || 0)).length
        : 0

      // 4. CAIXAS ATIVOS
      const { count: activeCashiers } = await supabase
        .from('cashier_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      // 5. TOP PRODUTOS
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product: products (name),
          sales!inner (status, created_at)
        `)
        .eq('sales.status', 'concluido')
        .gte('sales.created_at', startOfDay)
        .lte('sales.created_at', endOfDay)

      const productMap = {}
      if (itemsData) {
        itemsData.forEach(item => {
          const prodName = item.product?.name || 'Desconhecido'
          productMap[prodName] = (productMap[prodName] || 0) + item.quantity
        })
      }

      const topProducts = Object.entries(productMap)
        .map(([name, qtd]) => ({ name, qtd }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5)

      setMetrics({ todayRevenue, ticketMedio, openOrders, lowStockCount, activeCashiers })
      setChartsData({ salesByHour, paymentMethods, topProducts })

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleTestPrint() {
    const fakeOrder = {
      id: 'TESTE',
      sequence_id: 999,
      created_at: new Date().toISOString(),
      total: 45.90,
      payment_method: 'PIX',
      change: 0,
      items: [
        { quantity: 2, name: 'X-Bacon Hawk', price: 15.00 },
        { quantity: 1, name: 'Coca-Cola 600ml', price: 8.90 },
        { quantity: 1, name: 'Batata Frita P', price: 7.00 }
      ]
    }
    setPrintingOrder(fakeOrder)
    setTimeout(() => window.print(), 100)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* PORTAL DE IMPRESSÃO */}
      {printingOrder && (
        <PrintPortal>
          <CustomerReceipt order={printingOrder} />
        </PrintPortal>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Gerencial</h1>
          <p className="text-sm text-slate-500 capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleTestPrint}
                className="no-print flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
                <Printer size={16} /> Testar Impressora
            </button>
        </div>
      </div>

      {/* CARDS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <StatCard 
          title="Faturamento Hoje"
          value={loading ? "..." : `R$ ${metrics.todayRevenue.toFixed(2)}`}
          icon={<DollarSign size={20} className="text-green-600" />}
          color="bg-green-600"
          description={`${metrics.ticketMedio > 0 ? 'Ticket Médio: R$ ' + metrics.ticketMedio.toFixed(2) : 'Sem vendas'}`}
        />

        <StatCard 
          title="Pedidos na Cozinha"
          value={loading ? "..." : metrics.openOrders}
          icon={<ShoppingBag size={20} className="text-blue-600" />}
          color="bg-blue-600"
          description="Aguardando ou Em preparo"
        />

        <StatCard 
          title="Caixas Abertos"
          value={loading ? "..." : metrics.activeCashiers}
          icon={<Users size={20} className="text-violet-600" />}
          color="bg-violet-600"
          description="Sessões ativas agora"
        />

        <div 
          onClick={() => navigate('/estoque')}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard 
            title="Estoque Baixo"
            value={loading ? "..." : metrics.lowStockCount}
            icon={<AlertTriangle size={20} className="text-red-600" />}
            color="bg-red-600"
            description="Itens abaixo do mínimo"
          />
        </div>

      </div>

      {/* ÁREA DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Vendas por Hora */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-semibold text-slate-700 mb-6 flex items-center gap-2">
            <TrendingUp size={18} /> Fluxo de Vendas (Hora a Hora)
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartsData.salesByHour}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip 
                formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Vendas']} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="valor" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Meios de Pagamento */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <CreditCard size={18} /> Pagamentos
          </h3>
          <div className="h-full w-full flex flex-col items-center justify-center -mt-6">
             {chartsData.paymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartsData.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="text-center text-slate-400">
                   <p className="text-sm">Sem dados hoje</p>
                </div>
             )}
          </div>
        </div>

        {/* Top Produtos */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
             <ArrowUpRight size={18} /> Produtos Mais Vendidos (Top 5)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {chartsData.topProducts.length > 0 ? (
                chartsData.topProducts.map((prod, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center text-center">
                     <span className={`text-2xl font-bold ${idx === 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                        {prod.qtd}
                     </span>
                     <span className="text-xs text-slate-500 uppercase font-bold mt-1 line-clamp-2">
                        {prod.name}
                     </span>
                     {idx === 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-2">Campeão</span>}
                  </div>
                ))
              ) : (
                <div className="col-span-5 text-center py-8 text-slate-400">
                   Nenhum produto vendido hoje.
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  )
}