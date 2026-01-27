import { DollarSign, Users, AlertTriangle, ShoppingBag, CreditCard, ArrowUpRight, Utensils, ChefHat, Beer, Clock, Flame, Bike, Calendar } from 'lucide-react'
import { StatCard } from '../StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ea1d2c']

// WIDGET 1: Faturamento (Tipografia ajustada para mobile)
export const RevenueWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs md:text-sm font-medium text-slate-500">Vendas Totais</span>
        <div className="p-1.5 md:p-2 bg-green-100 rounded-lg text-green-600"><DollarSign size={18} /></div>
      </div>
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">R$ {data.todayRevenue?.toFixed(2)}</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 p-1.5 rounded text-green-800 border border-green-100">
                <span className="block font-bold">Recebido</span>
                R$ {data.revenuePaid?.toFixed(2)}
            </div>
            <div className="bg-yellow-50 p-1.5 rounded text-yellow-800 border border-yellow-100">
                <span className="block font-bold">Aberto/Mesa</span>
                R$ {data.revenueOpen?.toFixed(2)}
            </div>
        </div>
      </div>
  </div>
)

// WIDGET 2: Itens KDS
export const OrdersWidget = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs md:text-sm font-medium text-slate-500">Fila de Produção</span>
        <div className="p-1.5 md:p-2 bg-orange-100 rounded-lg text-orange-600">
          <ChefHat size={18} />
        </div>
      </div>
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">
          {data.kds?.kitchenQueue + data.kds?.barQueue + data.kds?.kitchenPrep + data.kds?.barPrep || 0} <span className="text-xs font-normal text-slate-400">itens</span>
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded text-blue-900">
                <div className="flex items-center gap-1 font-bold mb-1"><Utensils size={12}/> Cozinha</div>
                <div className="flex justify-between">
                    <span>Fila: <b>{data.kds?.kitchenQueue}</b></span>
                    <span>Prep: <b>{data.kds?.kitchenPrep}</b></span>
                </div>
            </div>
            <div className="bg-purple-50 p-2 rounded text-purple-900">
                <div className="flex items-center gap-1 font-bold mb-1"><Beer size={12}/> Bar</div>
                <div className="flex justify-between">
                    <span>Fila: <b>{data.kds?.barQueue}</b></span>
                    <span>Prep: <b>{data.kds?.barPrep}</b></span>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

// WIDGET 3: Mesas
export const TablesWidget = ({ data }) => (
  <StatCard 
    title="Mesas Abertas"
    value={data.openTables || 0}
    icon={<Users size={20} className="text-blue-600" />}
    color="bg-blue-600"
    description="Em atendimento"
  />
)

// WIDGET 4: Estoque
export const StockWidget = ({ data }) => (
  <StatCard 
    title="Alerta Estoque"
    value={data.lowStockCount || 0}
    icon={<AlertTriangle size={20} className="text-red-600" />}
    color="bg-red-600"
    description="Itens abaixo do mínimo"
  />
)

// WIDGET 5: Caixas
export const CashiersWidget = ({ data }) => (
  <StatCard 
    title="Caixas Ativos"
    value={data.activeCashiers || 0}
    icon={<ShoppingBag size={20} className="text-purple-600" />}
    color="bg-purple-600"
    description="Operadores logados"
  />
)

// WIDGET 6: Vendas por Dia
export const DailySalesWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-sm md:text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <Calendar size={18} /> Vendas por Dia
    </h3>
    <div className="flex-1 min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.dailySales || []}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(d) => d.split('/').slice(0,2).join('/')} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Venda']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Bar dataKey="loja" name="Loja" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
          <Bar dataKey="ifood" name="iFood" stackId="a" fill="#ea1d2c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)

// WIDGET 7: Gráfico Vendas por Hora
export const SalesChartWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-sm md:text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <Clock size={18} /> Vendas por Horário <span className="text-[10px] md:text-xs font-normal text-slate-400 ml-1">(Média)</span>
    </h3>
    <div className="flex-1 min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.salesByHour || []}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Média']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Legend />
          <Bar dataKey="local" name="Loja" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
          <Bar dataKey="ifood" name="iFood" stackId="a" fill="#ea1d2c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)

// WIDGET 8: Gráfico iFood
export const IfoodChartWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-sm md:text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
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

// WIDGET 9: Pagamentos
export const PaymentChartWidget = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="text-sm md:text-lg font-semibold text-slate-700 mb-2 flex items-center gap-2">
      <CreditCard size={18} /> Pagamentos
    </h3>
    <div className="flex-1 min-h-[200px] relative">
       <ResponsiveContainer width="100%" height="100%">
         <PieChart>
           <Pie
             data={data.paymentMethods}
             cx="50%"
             cy="45%"
             innerRadius={45}
             outerRadius={65}
             paddingAngle={5}
             dataKey="value"
           >
             {data.paymentMethods?.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={entry.name === 'AGUARDANDO PAGTO' ? '#cbd5e1' : COLORS[index % COLORS.length]} />
             ))}
           </Pie>
           <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
           <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center" 
                wrapperStyle={{fontSize: '10px', bottom: 0}}
           />
         </PieChart>
       </ResponsiveContainer>
        {(!data.paymentMethods || data.paymentMethods.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
        )}
    </div>
  </div>
)

// WIDGET 10: Top Produtos (GRID MOBILE INTELIGENTE)
export const TopProductsWidget = ({ data }) => (
  <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <h3 className="text-sm md:text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <ArrowUpRight size={18} /> Top Produtos (Por Receita)
      </h3>
      {/* MOBILE: Grid com 2 colunas para economizar scroll vertical */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {data.topProducts?.length > 0 ? (
          data.topProducts.map((prod, idx) => (
            <div key={idx} className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100 flex flex-col items-center text-center hover:border-blue-200 transition-colors relative overflow-hidden active:scale-95 duration-100">
                <span className={`text-base md:text-xl font-bold ${idx === 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  R$ {prod.total.toFixed(2)}
                </span>
                
                <span className="text-[10px] md:text-xs text-slate-400 font-medium mb-1">
                  {prod.quantity} un.
                </span>

                <span className="text-[10px] md:text-xs text-slate-500 uppercase font-bold line-clamp-2 leading-tight" title={prod.name}>
                  {prod.name}
                </span>
                {idx === 0 && (
                    <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">
                        <Flame size={10} className="inline mr-1"/> TOP 1
                    </div>
                )}
            </div>
          ))
        ) : (
          <div className="col-span-2 md:col-span-5 text-center text-slate-400 text-sm py-8">Nenhum produto vendido.</div>
        )}
      </div>
  </div>
)