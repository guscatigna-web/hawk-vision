import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Utensils, Loader2, DollarSign, Clock, CheckCircle } from 'lucide-react' // Adicionei CheckCircle
import { supabase } from '../lib/supabase'

export function Mesas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [openSales, setOpenSales] = useState([])
  
  const tables = Array.from({ length: 15 }, (_, i) => i + 1)

  useEffect(() => {
    fetchOpenTables()

    const channel = supabase
      .channel('mesas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchOpenTables()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchOpenTables() {
    try {
      // CORREÇÃO AQUI:
      // Antes buscava .eq('status', 'aberto')
      // Agora busca TUDO que NÃO for 'concluido' nem 'cancelado'
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .not('status', 'in', '("concluido","cancelado")') // Sintaxe correta para NOT IN
        .not('table_number', 'is', null)
      
      if (error) throw error
      setOpenSales(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableClick = (tableNumber) => {
    const existingSale = openSales.find(s => s.table_number === tableNumber)
    
    if (existingSale) {
      navigate(`/vendas?mesa=${tableNumber}&saleId=${existingSale.id}`)
    } else {
      navigate(`/vendas?mesa=${tableNumber}`)
    }
  }

  const getDuration = (startDate) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffMs = now - start
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Mesas</h2>
        <p className="text-sm text-slate-500">Acompanhamento em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {tables.map(num => {
          const sale = openSales.find(s => s.table_number === num)
          const isOccupied = !!sale
          
          // Verifica se o pedido está pronto para diferenciar a cor
          const isReady = sale?.status === 'pronto'

          return (
            <button
              key={num}
              onClick={() => handleTableClick(num)}
              className={`relative h-40 rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-1 ${
                isOccupied 
                  ? isReady 
                    ? 'bg-green-50 border-green-200 text-green-700' // Cor diferente se estiver PRONTO
                    : 'bg-red-50 border-red-200 text-red-700'      // Cor normal ocupada
                  : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300 hover:text-blue-500'
              }`}
            >
              <span className={`text-2xl font-bold mb-2 ${isOccupied ? (isReady ? 'text-green-800' : 'text-red-800') : 'text-slate-700'}`}>
                {num}
              </span>
              
              {isReady ? <CheckCircle size={24} /> : <Utensils size={isOccupied ? 24 : 32} className={isOccupied ? 'opacity-50' : 'opacity-20'} />}

              {isOccupied ? (
                <div className="mt-3 text-center w-full px-2">
                  <div className="bg-white/60 rounded-lg py-1 px-2 mb-1 flex items-center justify-center gap-1 text-sm font-bold text-slate-800">
                    <DollarSign size={12}/> {sale.total.toFixed(2)}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-medium opacity-80">
                    <Clock size={10} /> {getDuration(sale.created_at)}
                  </div>
                  {isReady && <span className="text-[10px] font-bold uppercase mt-1 block">Pedido Pronto</span>}
                </div>
              ) : (
                <span className="absolute bottom-4 text-xs font-medium uppercase tracking-wider opacity-60">
                  Livre
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}