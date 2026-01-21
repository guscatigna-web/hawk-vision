/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'
import { PrinterService } from '../services/printer' // Import do Serviço de Impressão

const CashierContext = createContext()

export function CashierProvider({ children }) {
  const { user } = useAuth()
  const [currentSession, setCurrentSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) checkOpenSession()
  }, [user])

  async function checkOpenSession() {
    try {
      const { data, error } = await supabase
        .from('cashier_sessions')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)

      if (error) throw error
      setCurrentSession(data?.[0] || null) 
    } catch (error) {
      console.error('Erro ao verificar caixa:', error)
    } finally {
      setLoading(false)
    }
  }

  // ABRIR CAIXA (PRESERVADO)
  async function openCashier(initialBalance, type = 'normal') {
    try {
      if (!user?.id) throw new Error("Usuário não autenticado.")

      const userIdStr = String(user.id);
      const isNumericId = /^\d+$/.test(userIdStr); 
      const searchColumn = isNumericId ? 'id' : 'auth_user_id';

      const { data: employee } = await supabase.from('employees').select('id, company_id, role').eq(searchColumn, userIdStr).maybeSingle()

      if (!employee) throw new Error("Funcionário não encontrado.")
      
      const { data, error } = await supabase
        .from('cashier_sessions')
        .insert({
          employee_id: employee.id,    
          company_id: employee.company_id, 
          initial_balance: parseFloat(initialBalance),
          status: 'open',
          opened_at: new Date().toISOString(),
          type: type
        })
        .select()
        .single()

      if (error) throw error
      setCurrentSession(data)
      toast.success('Caixa aberto com sucesso!')
      return true
    } catch (error) {
      console.error('Erro ao abrir caixa:', error)
      toast.error(error.message)
      return false
    }
  }

  // --- NOVA FUNÇÃO DE FECHAMENTO (COM RELATÓRIO Z) ---
  async function closeCashier(closingData) {
    if (!currentSession) return

    const toastId = toast.loading("Calculando fechamento...")

    try {
      // 1. Busca todos os dados da sessão para consolidar
      const { data: sales } = await supabase.from('sales').select('*, sale_payments(*), sale_items(quantity, unit_price, product:products(name))').eq('cashier_session_id', currentSession.id)
      const { data: transactions } = await supabase.from('cashier_transactions').select('*').eq('session_id', currentSession.id)

      // 2. Cálculos do Sistema
      const activeSales = sales.filter(s => s.status === 'concluido');
      const canceledSales = sales.filter(s => s.status === 'cancelado');

      const grossSales = activeSales.reduce((acc, s) => acc + Number(s.total), 0);
      const supplies = transactions.filter(t => t.type === 'suprimento').reduce((acc, t) => acc + Number(t.amount), 0);
      const bleeds = transactions.filter(t => t.type === 'sangria').reduce((acc, t) => acc + Number(t.amount), 0);
      const discounts = activeSales.reduce((acc, s) => acc + (Number(s.discount_value) || 0), 0);

      // Saldo esperado TOTAL (Considerando que todo dinheiro entra no balanço geral)
      const systemBalance = (Number(currentSession.initial_balance) + grossSales + supplies) - bleeds;

      // 3. Totais por Método (Sistema)
      const systemTotalsByMethod = {};
      
      // Itera sobre pagamentos das vendas para separar cartão, dinheiro, pix, etc.
      activeSales.forEach(sale => {
        sale.sale_payments?.forEach(pay => {
            const method = pay.payment_method || 'Outros';
            systemTotalsByMethod[method] = (systemTotalsByMethod[method] || 0) + Number(pay.amount);
        });
        // Fallback para vendas antigas sem sale_payments
        if (!sale.sale_payments || sale.sale_payments.length === 0) {
             const method = sale.payment_method || 'Outros';
             systemTotalsByMethod[method] = (systemTotalsByMethod[method] || 0) + Number(sale.total);
        }
      });

      // Adiciona Fundo de Troco e Movimentações ao método "Dinheiro"
      const cashMethodName = 'Dinheiro'; // Certifique-se que o nome bate com seu cadastro
      systemTotalsByMethod[cashMethodName] = (systemTotalsByMethod[cashMethodName] || 0) + Number(currentSession.initial_balance) + supplies - bleeds;

      // 4. Calcula Total Informado pelo Usuário
      const reportedTotal = Object.values(closingData.amounts).reduce((acc, val) => acc + Number(val), 0);
      
      // Diferença Global
      const difference = reportedTotal - systemBalance;

      // 5. Prepara Comparativo para o Relatório e Banco
      const methodsComparison = {};
      // Une as chaves do sistema e do informado para não perder nada
      const allMethods = new Set([...Object.keys(systemTotalsByMethod), ...Object.keys(closingData.amounts)]);
      
      allMethods.forEach(method => {
          methodsComparison[method] = {
              system: systemTotalsByMethod[method] || 0,
              reported: parseFloat(closingData.amounts[method]) || 0
          };
      });

      // Agrupa Itens Vendidos (Curva ABC)
      const soldItemsMap = {};
      activeSales.forEach(sale => {
          sale.sale_items?.forEach(item => {
              const name = item.product?.name || item.product_name || 'Item Avulso';
              if (!soldItemsMap[name]) soldItemsMap[name] = { quantity: 0, total: 0 };
              soldItemsMap[name].quantity += item.quantity;
              soldItemsMap[name].total += (item.quantity * item.unit_price);
          });
      });
      const soldItemsList = Object.entries(soldItemsMap).map(([name, data]) => ({ name, ...data }));

      // 6. Atualiza Banco (Fechamento)
      const { error } = await supabase
        .from('cashier_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          final_balance: reportedTotal, // O que o operador disse que tem
          system_balance: systemBalance, // O que o sistema calculou que deveria ter
          difference: difference,
          closing_data: methodsComparison, // JSON com o detalhe da conferência
          notes: closingData.notes
        })
        .eq('id', currentSession.id)

      if (error) throw error

      // 7. Imprime Relatório Z
      const reportData = {
          session: { ...currentSession, difference, employee_name: user?.name },
          totals: { grossSales, supplies, bleeds, discounts, expectedTotal: systemBalance },
          methods: methodsComparison,
          items: soldItemsList,
          cancellations: canceledSales.map(s => ({ display_id: s.display_id || s.id, reason: s.notes, total: s.total }))
      };

      try {
          await PrinterService.printZReport(reportData);
          toast.success('Caixa fechado e Relatório Z impresso!', { id: toastId });
      } catch (printError) {
          console.error("Erro impressão Z:", printError);
          toast.error('Caixa fechado, mas erro ao imprimir Z.', { id: toastId });
      }

      setCurrentSession(null)
      return true

    } catch (error) {
      console.error(error)
      toast.error('Erro ao fechar caixa.', { id: toastId })
      return false
    }
  }

  // ADICIONAR MOVIMENTAÇÃO (PRESERVADO)
  async function addTransaction(type, amount, description, paymentMethod = null) {
    if (!currentSession) { toast.error('Nenhum caixa aberto.'); return false }
    try {
      const payload = {
        session_id: currentSession.id,
        company_id: currentSession.company_id, 
        type,
        amount: parseFloat(amount),
        description,
        created_at: new Date().toISOString()
      };
       if (paymentMethod) payload.payment_method = paymentMethod;
      const { error } = await supabase.from('cashier_transactions').insert(payload)
      if (error) throw error
      toast.success('Movimentação registrada.')
      return true
    } catch (error) { console.error(error); toast.error('Erro ao salvar movimentação.'); return false }
  }

  // CANCELAR VENDA (PRESERVADO)
  async function cancelSale(saleId, reason) {
    try {
      const userIdStr = String(user.id);
      const isNumericId = /^\d+$/.test(userIdStr); 
      const searchColumn = isNumericId ? 'id' : 'auth_user_id';
      const { data: currentEmp } = await supabase.from('employees').select('id').eq(searchColumn, userIdStr).single();

      const { error: saleError } = await supabase.from('sales').update({ status: 'cancelado', notes: reason ? `Cancelado: ${reason}` : 'Cancelado pelo operador' }).eq('id', saleId)
      if (saleError) throw saleError

      const { data: sale } = await supabase.from('sales').select(`*, sale_items (quantity, product_id, product:products (stock_quantity, track_stock))`).eq('id', saleId).single()

      if (sale.sale_items && sale.sale_items.length > 0) {
        for (const item of sale.sale_items) {
          if (item.product?.track_stock) {
             const newStock = item.product.stock_quantity + item.quantity
             await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id)
             await supabase.from('stock_movements').insert({ product_id: item.product_id, company_id: sale.company_id, employee_id: currentEmp?.id, type: 'entrada', reason: 'devolucao_venda', quantity: item.quantity, old_stock: item.product.stock_quantity, new_stock: newStock, created_at: new Date().toISOString() })
          }
        }
      }
      toast.success('Venda cancelada e estoque estornado!')
      return true
    } catch (error) { console.error(error); toast.error('Erro ao cancelar venda.'); return false }
  }

  return (
    <CashierContext.Provider value={{ currentSession, loading, openCashier, closeCashier, addTransaction, checkOpenSession, cancelSale }}>
      {children}
    </CashierContext.Provider>
  )
}

export const useCashier = () => useContext(CashierContext)