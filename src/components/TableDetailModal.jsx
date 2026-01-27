import React from 'react'
import { X, Users, Plus, Printer, ArrowRightLeft, DollarSign } from 'lucide-react'

export function TableDetailModal({ 
  sale, 
  companyInfo, 
  onClose, 
  onUpdatePeople, 
  onAddItems, 
  onPrintBill, 
  onTransfer, 
  onPay 
}) {
  if (!sale) return null

  const isReserved = sale.status === 'reservada'
  // Garante que a data seja válida antes de tentar formatar
  const createdDate = sale.created_at ? new Date(sale.created_at) : new Date()
  
  // Função auxiliar para evitar prop drilling ou repetição
  const handlePeopleChange = (delta) => {
    // Ajuste: Considera pax se people_count vier zerado
    const current = sale.people_count || sale.pax || 0
    const next = Math.max(0, current + delta)
    onUpdatePeople(next)
  }

  // Definição segura dos itens
  const itemsList = sale.items || sale.sale_items || []

  return (
    // ALTERAÇÃO CHAVE: 
    // 1. 'items-start' no mobile -> Cola o modal no topo (remove espaço em branco de cima)
    // 2. 'md:items-center' -> Mantém centralizado no PC
    // 3. 'pt-4' -> Dá um pequeno respiro do topo da tela no celular
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center p-2 md:p-4 pt-4 md:pt-4 animate-fade-in">
      
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[90vh]">
        
        {/* CABEÇALHO (Responsivo) */}
        <div className="bg-slate-900 text-white p-4 md:p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              Mesa {sale.table_number || sale.number}
              {/* Proteção contra crash de ID numérico */}
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-normal hidden sm:inline-block">
                #{String(sale.id).slice(0,8)}
              </span>
            </h2>
            <p className="text-slate-400 text-xs md:text-sm">
              {isReserved 
                ? 'MESA RESERVADA' 
                : `Aberta às ${createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
              }
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 custom-scrollbar">
          
          {/* CONTROLE DE PESSOAS */}
          <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 mb-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Users size={20} />
              <span className="font-bold text-sm">Pessoas:</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePeopleChange(-1)} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors active:scale-95"
              >-</button>
              <span className="w-6 md:w-8 text-center font-bold text-lg text-slate-800">{sale.people_count || sale.pax || 0}</span>
              <button 
                onClick={() => handlePeopleChange(1)} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors active:scale-95"
              >+</button>
            </div>
          </div>

          {/* LISTA DE ITENS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            {itemsList.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-slate-400 italic text-sm">
                {isReserved ? 'Aguardando chegada do cliente.' : 'Nenhum item lançado.'}
              </div>
            ) : (
              itemsList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-3">
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs h-fit mt-0.5">{item.quantity}x</span>
                    <div>
                        <span className="text-slate-700 font-medium text-sm md:text-base block leading-tight">{item.product?.name || item.product_name || 'Item'}</span>
                        {item.observation && <span className="text-[10px] text-amber-600 italic block mt-0.5">{item.observation}</span>}
                    </div>
                  </div>
                  <span className="text-slate-600 font-bold text-sm whitespace-nowrap">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
          
          {/* TOTAIS */}
          <div className="space-y-2 px-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-sm md:text-base">Subtotal</span>
              <span className="text-lg md:text-xl font-bold text-slate-800">R$ {(sale.total || 0).toFixed(2)}</span>
            </div>
            
            {companyInfo?.service_fee > 0 && (sale.total || 0) > 0 && (
              <div className="flex justify-between items-center text-xs md:text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                <span>+ Serviço ({companyInfo.service_fee}%)</span>
                <span className="font-bold">
                  R$ {((sale.total || 0) * (companyInfo.service_fee / 100)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES (Grid Responsivo) */}
        <div className="p-4 md:p-5 bg-white border-t border-slate-200 grid grid-cols-2 gap-3 shrink-0">
          
          <button 
            onClick={onAddItems} 
            className="col-span-2 py-3 md:py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all text-sm md:text-base"
          >
            <Plus size={18} className="md:w-5 md:h-5"/> 
            {isReserved ? 'Iniciar Atendimento' : 'Adicionar Itens'}
          </button>
          
          <button 
            onClick={onPrintBill} 
            disabled={(sale.total || 0) <= 0} 
            className="py-2.5 md:py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
          >
            <Printer size={16} className="md:w-5 md:h-5"/> Parcial
          </button>
          
          <button 
            onClick={onTransfer} 
            disabled={isReserved} 
            className="py-2.5 md:py-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
          >
            <ArrowRightLeft size={16} className="md:w-5 md:h-5"/> Transferir
          </button>

          <button 
            onClick={onPay} 
            disabled={(sale.total || 0) <= 0} 
            className="col-span-2 py-3 md:py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1 text-sm md:text-base"
          >
            <DollarSign size={20} className="md:w-6 md:h-6"/> Fechar Conta (Caixa)
          </button>
        </div>

      </div>
    </div>
  )
}