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

  // ABRIR CAIXA (Lógica Híbrida: Aceita ID Numérico ou UUID)
  async function openCashier(initialBalance, type = 'normal') {
    try {
      if (!user?.id) throw new Error("Usuário não autenticado.")

      // 1. Determina qual coluna buscar baseado no formato do ID que o Frontend mandou
      // Se for apenas números, busca na coluna 'id'. Se tiver letras/traços, busca em 'auth_user_id'
      const userIdStr = String(user.id);
      const isNumericId = /^\d+$/.test(userIdStr); 
      const searchColumn = isNumericId ? 'id' : 'auth_user_id';

      console.log(`🔍 Buscando funcionário. Input: "${userIdStr}" -> Coluna Alvo: "${searchColumn}"`);

      // 2. Busca o funcionário
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, company_id, role')
        .eq(searchColumn, userIdStr) // <--- Aqui está a correção mágica
        .maybeSingle()

      if (empError) {
        console.error("Erro SQL Busca Funcionário:", empError)
        throw new Error("Erro técnico ao buscar cadastro do funcionário.")
      }

      if (!employee) {
        throw new Error(`Funcionário não encontrado (ID: ${userIdStr}). Verifique o cadastro na tabela employees.`)
      }
      
      if (!employee.company_id) {
        throw new Error("Seu perfil não está vinculado a nenhuma empresa.")
      }

      // 3. Abre o caixa
      // IMPORTANTE: Sempre usamos employee.id (o numérico do banco) para salvar na sessão
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

  // FECHAR CAIXA
  async function closeCashier(finalData) {
    if (!currentSession) return

    try {
      const { error } = await supabase
        .from('cashier_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          final_balance: parseFloat(finalData.closingAmount),
          notes: finalData.notes,
          difference: parseFloat(finalData.closingAmount) - (currentSession.system_balance || 0)
        })
        .eq('id', currentSession.id)

      if (error) throw error

      setCurrentSession(null)
      toast.success('Caixa encerrado.')
      return true
    } catch (error) {
      console.error(error)
      toast.error('Erro ao fechar caixa.')
      return false
    }
  }

  // ADICIONAR MOVIMENTAÇÃO
  async function addTransaction(type, amount, description) {
    if (!currentSession) {
      toast.error('Nenhum caixa aberto.')
      return false
    }

    try {
      const { error } = await supabase
        .from('cashier_transactions')
        .insert({
          session_id: currentSession.id,
          type,
          amount: parseFloat(amount),
          description,
          created_at: new Date().toISOString()
        })

      if (error) throw error
      
      toast.success('Movimentação registrada.')
      return true
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar movimentação.')
      return false
    }
  }

  // CANCELAR VENDA
  async function cancelSale(saleId, reason) {
    try {
      // Busca dados do funcionário atual (Híbrido também, para garantir)
      const userIdStr = String(user.id);
      const isNumericId = /^\d+$/.test(userIdStr); 
      const searchColumn = isNumericId ? 'id' : 'auth_user_id';
      
      const { data: currentEmp } = await supabase
        .from('employees')
        .select('id')
        .eq(searchColumn, userIdStr)
        .single();

      // 1. Atualiza Venda
      const { error: saleError } = await supabase
        .from('sales')
        .update({ 
            status: 'cancelado',
            notes: reason ? `Cancelado: ${reason}` : 'Cancelado pelo operador'
        })
        .eq('id', saleId)

      if (saleError) throw saleError

      // 2. Busca itens e estorna
      const { data: sale } = await supabase
        .from('sales')
        .select(`*, sale_items (quantity, product_id, product:products (stock_quantity, track_stock))`)
        .eq('id', saleId)
        .single()

      if (sale.sale_items && sale.sale_items.length > 0) {
        for (const item of sale.sale_items) {
          if (item.product?.track_stock) {
             const newStock = item.product.stock_quantity + item.quantity
             
             await supabase.from('products')
               .update({ stock_quantity: newStock })
               .eq('id', item.product_id)

             await supabase.from('stock_movements').insert({
                product_id: item.product_id,
                company_id: sale.company_id,
                employee_id: currentEmp?.id, // ID Numérico correto
                type: 'entrada',
                reason: 'devolucao_venda',
                quantity: item.quantity,
                old_stock: item.product.stock_quantity,
                new_stock: newStock,
                created_at: new Date().toISOString()
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