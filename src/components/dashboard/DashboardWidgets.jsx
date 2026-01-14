import { DollarSign, Users, AlertTriangle, ShoppingBag, TrendingUp, CreditCard, ArrowUpRight, Utensils, ChefHat, Beer, Clock, Flame } from 'lucide-react'
import { StatCard } from '../StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

// WIDGET 1: Faturamento
export const RevenueWidget = ({ data }) => (
  <StatCard 
    title="Faturamento Hoje"
    value={`R$ ${data.todayRevenue?.toFixed(2) || '0.00'}`}
    icon={<DollarSign size={20} className="text-green-600" />}
    color="bg-green-600"
    description={data.ticketMedio > 0 ? `Ticket Médio: R$ ${data.ticketMedio.toFixed(2)}` : 'Sem vendas'}
  />
)

// WIDGET 2: Itens KDS (DETALHADO)
export const OrdersWidget = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-500 text-xs font-bold uppercase">Produção (KDS)</span>
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
          <ShoppingBag size={20} />
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Bloco Cozinha */}
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <ChefHat size={16} className="text-orange-500"/> Cozinha
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-500" title="Na Fila">
              <Clock size={12}/> {data.kds?.kitchenQueue || 0}
            </span>
            <span className="flex items-center gap-1 text-orange-600 font-bold" title="Em Preparo">
              <Flame size={12}/> {data.kds?.kitchenPrep || 0}
            </span>
          </div>
        </div>

        {/* Bloco Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Beer size={16} className="text-purple-500"/> Bar
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-500" title="Na Fila">
              <Clock size={12}/> {data.kds?.barQueue || 0}
            </span>
            <span className="flex items-center gap-1 text-purple-600 font-bold" title="Em Preparo">
              <Flame size={12}/> {data.kds?.barPrep || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// WIDGET 3: Mesas Abertas
export const TablesWidget = ({ data }) => {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate('/mesas')} className="cursor-pointer h-full">
        <StatCard 
            title="Mesas Abertas"
            value={data.openTables || 0}
            icon={<Utensils size={20} className="text-orange-600" />}
            color="bg-orange-600"
            description="Em atendimento"
        />
    </div>
  )
}

// WIDGET 4: Caixas
export const CashiersWidget = ({ data }) => (
  <StatCard 
    title="Caixas Abertos"
    value={data.activeCashiers || 0}
    icon={<Users size={20} className="text-violet-600" />}
    color="bg-violet-600"
    description="Sessões ativas agora"
  />
)

// WIDGET 5: Estoque
export const StockWidget = ({ data }) => {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate('/estoque')} className="cursor-pointer h-full">
      <StatCard 
        title="Estoque Baixo"
        value={data.lowStockCount || 0}
        icon={<AlertTriangle size={20} className="text-red-600" />}
        color="bg-red-600"
        description="Itens abaixo do mínimo"
      />
    </div>
  )
}

// WIDGET 6: Gráfico Vendas
export const SalesChartWidget = ({ data }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96 flex flex-col">
    <h3 className="text-lg font-semibold text-slate-700 mb-6 flex items-center gap-2">
      <TrendingUp size={18} /> Fluxo de Vendas (Hora a Hora)
    </h3>
    <div className="flex-1 w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.salesByHour || []}>
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
  </div>
)

// WIDGET 7: Gráfico Pagamentos
export const PaymentChartWidget = ({ data }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96 flex flex-col">
    <h3 className="text-lg font-semibold text-slate-700 mb-2 flex items-center gap-2">
      <CreditCard size={18} /> Pagamentos
    </h3>
    <div className="flex-1 w-full min-h-0 relative">
        {data.paymentMethods?.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Sem vendas hoje
          </div>
        )}
    </div>
  </div>
)

// WIDGET 8: Top Produtos
export const TopProductsWidget = ({ data }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <ArrowUpRight size={18} /> Produtos Mais Vendidos (Top 5)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {data.topProducts?.length > 0 ? (
          data.topProducts.map((prod, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center text-center hover:border-blue-200 transition-colors">
                <span className={`text-2xl font-bold ${idx === 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                  {prod.qtd}
                </span>
                <span className="text-xs text-slate-500 uppercase font-bold mt-1 line-clamp-2" title={prod.name}>
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
)