/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

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

  // ABRIR CAIXA
  async function openCashier(initialBalance, type = 'normal') {
    try {
      const { data, error } = await supabase
        .from('cashier_sessions')
        .insert({
          employee_id: user.id,
          initial_balance: parseFloat(initialBalance),
          status: 'open',
          type: type,
          opened_at: new Date().toISOString() 
        })
        .select()
        .single()

      if (error) throw error
      
      setCurrentSession(data)
      toast.success(type === 'express' ? 'Caixa Expresso Aberto! 🚀' : 'Caixa aberto com sucesso!')
      return true
    } catch (error) {
      console.error(error)
      toast.error('Erro ao abrir caixa.')
      return false
    }
  }

  // FECHAR CAIXA
  async function closeCashier(finalBalance, notes) {
    if (!currentSession) return

    try {
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('amount, type')
        .eq('cashier_session_id', currentSession.id)
        .eq('payment_method', 'dinheiro') 

      const movementSum = transactions?.reduce((acc, t) => acc + t.amount, 0) || 0
      const systemCalc = currentSession.initial_balance + movementSum
      const diff = parseFloat(finalBalance) - systemCalc

      const { error } = await supabase
        .from('cashier_sessions')
        .update({
          closed_at: new Date().toISOString(),
          final_balance: parseFloat(finalBalance),
          system_balance: systemCalc,
          difference: diff,
          status: 'closed',
          notes: notes
        })
        .eq('id', currentSession.id)

      if (error) throw error

      setCurrentSession(null)
      toast.success(`Caixa fechado! Diferença: R$ ${diff.toFixed(2)}`)
      return true
    } catch (error) {
      console.error(error)
      toast.error('Erro ao fechar caixa.')
      return false
    }
  }

  // REGISTRAR MOVIMENTAÇÃO
  async function addTransaction(type, amount, description, paymentMethod = 'dinheiro') {
    if (!currentSession && type !== 'despesa') {
      toast.error('Caixa fechado! Abra o caixa para movimentar dinheiro.')
      return false
    }

    try {
      const finalAmount = (type === 'sangria' || type === 'despesa' || type === 'estorno') ? -Math.abs(amount) : Math.abs(amount)

      const { error } = await supabase.from('financial_transactions').insert({
        cashier_session_id: currentSession?.id || null, 
        type,
        amount: finalAmount,
        description,
        payment_method: paymentMethod,
        created_by: user.id
      })

      if (error) throw error
      toast.success('Transação registrada.')
      return true
    } catch (error) {
      console.error(error)
      toast.error('Erro ao registrar transação.')
      return false
    }
  }

  // --- NOVA FUNÇÃO: CANCELAR VENDA (ESTORNO COMPLETO) ---
  async function cancelSale(saleId, reason) {
    if (!currentSession) return false

    try {
      // 1. Busca dados da venda e itens para devolver estoque
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*, sale_items(*, product:products(*))')
        .eq('id', saleId)
        .single()
      
      if (saleError) throw saleError
      if (sale.status === 'cancelado') {
        toast.error('Esta venda já foi cancelada.')
        return false
      }

      // 2. Atualiza status da venda
      await supabase.from('sales')
        .update({ status: 'cancelado' })
        .eq('id', saleId)

      // 3. Registra Estorno Financeiro (Valor Negativo no Caixa)
      await addTransaction(
        'estorno', 
        sale.total, 
        `Canc. Venda #${sale.id.toString().slice(0,4)} - ${reason}`, 
        sale.payment_method
      )

      // 4. Devolve Estoque (Loop Inteligente)
      // Nota: Idealmente faríamos isso via RPC no banco para ser atômico, 
      // mas faremos via código aqui para manter simplicidade no setup atual.
      if (sale.sale_items && sale.sale_items.length > 0) {
        for (const item of sale.sale_items) {
          // Se o produto controla estoque, devolvemos
          if (item.product.track_stock) {
             const newStock = item.product.stock_quantity + item.quantity
             
             // Atualiza produto
             await supabase.from('products')
               .update({ stock_quantity: newStock })
               .eq('id', item.product_id)

             // Registra movimento de entrada (Devolução)
             await supabase.from('stock_movements').insert({
                product_id: item.product_id,
                employee_id: user.id,
                type: 'entrada',
                reason: 'devolucao',
                quantity: item.quantity,
                old_stock: item.product.stock_quantity,
                new_stock: newStock
             })
          }
        }
      }

      toast.success('Venda cancelada e estoque estornado!')
      return true

    } catch (error) {
      console.error(error)
      toast.error('Erro ao cancelar venda.')
      return false
    }
  }

  return (
    <CashierContext.Provider value={{ currentSession, loading, openCashier, closeCashier, addTransaction, checkOpenSession, cancelSale }}>
      {children}
    </CashierContext.Provider>
  )
}

export const useCashier = () => useContext(CashierContext)