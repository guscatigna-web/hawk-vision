import { 
  RevenueWidget, 
  OrdersWidget, 
  TablesWidget, // Mantido original
  CashiersWidget, 
  StockWidget, 
  SalesChartWidget, 
  PaymentChartWidget, 
  TopProductsWidget,
  IfoodChartWidget // <--- ÚNICA ADIÇÃO
} from './DashboardWidgets'

export const WIDGET_REGISTRY = {
  revenue: { component: RevenueWidget, label: 'Faturamento', defaultColSpan: 'col-span-1' },
  orders: { component: OrdersWidget, label: 'Itens Cozinha (KDS)', defaultColSpan: 'col-span-1' },
  tables: { component: TablesWidget, label: 'Mesas Abertas', defaultColSpan: 'col-span-1' },
  cashiers: { component: CashiersWidget, label: 'Caixas Ativos', defaultColSpan: 'col-span-1' },
  stock: { component: StockWidget, label: 'Alerta Estoque', defaultColSpan: 'col-span-1' },
  salesChart: { component: SalesChartWidget, label: 'Gráfico de Vendas', defaultColSpan: 'col-span-1 lg:col-span-2' },
  ifoodChart: { component: IfoodChartWidget, label: 'Performance iFood', defaultColSpan: 'col-span-1 lg:col-span-2' }, // <--- NOVO
  paymentChart: { component: PaymentChartWidget, label: 'Gráfico Pagamentos', defaultColSpan: 'col-span-1' },
  topProducts: { component: TopProductsWidget, label: 'Top Produtos', defaultColSpan: 'col-span-1 lg:col-span-3' },
}