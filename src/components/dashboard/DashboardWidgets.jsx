import { DollarSign, Users, AlertTriangle, ShoppingBag, CreditCard, ArrowUpRight, Utensils, ChefHat, Beer, Clock, Flame, Bike, Calendar } from 'lucide-react'
import { StatCard } from '../StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ea1d2c']

// WIDGET 1: Faturamento (Visual Original)
export const RevenueWidget = ({ data }) => (
  <StatCard 
    title="Faturamento"
    value={`R$ ${data.todayRevenue?.toFixed(2) || '0.00'}`}
    icon={<DollarSign size={20} className="text-green-600" />}
    color="bg-green-600"
    description={data.ticketMedio > 0 ? `Ticket Médio: R$ ${data.ticketMedio.toFixed(2)}` : 'Sem vendas'}
  />
)

// WIDGET 2: Itens KDS (Visual Original)
export const OrdersWidget = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-slate-500">Fila de Produção</span>
        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
          <ChefHat size={20} />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">
          {data.kds?.kitchenQueue + data.kds?.barQueue || 0}
        </h3>
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 bg-slate-50 p-1 rounded">
                <span className="flex items-center gap-1"><Utensils size={12}/> Cozinha</span>
                <span className="font-bold">{data.kds?.kitchenQueue || 0}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 bg-slate-50 p-1 rounded">
                <span className="flex items-center gap-1"><Beer size={12}/> Bar</span>
                <span className="font-bold">{data.kds?.barQueue || 0}</span>
            </div>
        </div>
      </div>
    </div>
  )
}

// WIDGET 3: Mesas (Visual Original)
export const TablesWidget = ({ data }) => (
  <StatCard 
    title="Mesas Abertas"
    value={data.openTables || 0}
    icon={<Users size={20} className="text-blue-600" />}
    color="bg-blue-600"
    description="Em atendimento"
  />
)

// WIDGET 4: Estoque (Visual Original)
export const StockWidget = ({ data }) => (
  <StatCard 
    title="Alerta Estoque"
    value={data.lowStockCount || 0}
    icon={<AlertTriangle size={20} className="text-red-600" />}
    color="bg-red-600"
    description="Itens abaixo do mínimo"
  />
)

// WIDGET 5: Caixas (Visual Original)
export const CashiersWidget = ({ data }) => (
  <StatCard 
    title="Caixas Ativos"
    value={data.activeCashiers || 0}
    icon={<ShoppingBag size={20} className="text-purple-600" />}
    color="bg-purple-600"
    description="Operadores logados"
  />
)

// WIDGET 6: Gráfico Vendas (ATUALIZADO PARA STACKED)
export const SalesChartWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <Clock size={18} /> Vendas por Horário
    </h3>
    <div className="flex-1 min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.salesByHour || []}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            formatter={(value) => [`R$ ${value}`, 'Venda']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Bar dataKey="local" name="Local" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
          <Bar dataKey="ifood" name="iFood" stackId="a" fill="#ea1d2c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)

// WIDGET 7: Gráfico iFood (NOVO)
export const IfoodChartWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <Bike size={18} className="text-red-600" /> Performance iFood
    </h3>
    <div className="flex-1 min-h-[200px]">
      {data.ifoodSalesByDay && data.ifoodSalesByDay.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.ifoodSalesByDay}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" fontSize={10} tickFormatter={(d) => d.split('/').slice(0,2).join('/')} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
            <Legend />
            <Line type="monotone" dataKey="total" name="Vendas (R$)" stroke="#ea1d2c" strokeWidth={3} dot={{r: 4}} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
           <Calendar size={32} className="mb-2 opacity-20"/>
           Sem vendas iFood no período
        </div>
      )}
    </div>
  </div>
)

// WIDGET 8: Pagamentos (ORIGINAL MANTIDO - Mostra todos os tipos)
export const PaymentChartWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-lg font-semibold text-slate-700 mb-2 flex items-center gap-2">
      <CreditCard size={18} /> Pagamentos
    </h3>
    <div className="flex-1 min-h-[200px] relative">
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
             {data.paymentMethods?.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
             ))}
           </Pie>
           <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
           <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '11px'}}/>
         </PieChart>
       </ResponsiveContainer>
        {(!data.paymentMethods || data.paymentMethods.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Sem dados
          </div>
        )}
    </div>
  </div>
)

// WIDGET 9: Top Produtos (Visual Original)
export const TopProductsWidget = ({ data }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <ArrowUpRight size={18} /> Top Produtos
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
                {idx === 0 && <span className="mt-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1"><Flame size={10}/> Campeão</span>}
            </div>
          ))
        ) : (
          <div className="col-span-5 text-center text-slate-400 text-sm py-8">
             Nenhum produto vendido.
          </div>
        )}
      </div>
  </div>
)