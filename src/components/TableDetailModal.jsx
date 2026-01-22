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
  const createdDate = new Date(sale.created_at)
  
  // Função auxiliar para evitar prop drilling ou repetição
  const handlePeopleChange = (delta) => {
    const current = sale.people_count || 0
    const next = Math.max(0, current + delta)
    onUpdatePeople(next)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Mesa {sale.table_number}
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-normal">#{sale.id}</span>
            </h2>
            <p className="text-slate-400 text-sm">
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
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          
          {/* CONTROLE DE PESSOAS */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Users size={20} />
              <span className="font-bold text-sm">Quantidade de Pessoas:</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePeopleChange(-1)} 
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
              >-</button>
              <span className="w-8 text-center font-bold text-lg text-slate-800">{sale.people_count || 0}</span>
              <button 
                onClick={() => handlePeopleChange(1)} 
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
              >+</button>
            </div>
          </div>

          {/* LISTA DE ITENS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            {(!sale.sale_items || sale.sale_items.length === 0) ? (
              <div className="p-8 text-center text-slate-400 italic">
                {isReserved ? 'Aguardando chegada do cliente.' : 'Nenhum item lançado.'}
              </div>
            ) : (
              sale.sale_items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded text-xs">{item.quantity}x</span>
                    <span className="text-slate-700 font-medium">{item.product?.name || 'Item'}</span>
                  </div>
                  <span className="text-slate-600 font-medium">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
          
          {/* TOTAIS */}
          <div className="space-y-1 px-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="text-xl font-bold text-slate-800">R$ {sale.total.toFixed(2)}</span>
            </div>
            {companyInfo?.service_fee > 0 && sale.total > 0 && (
              <div className="flex justify-between items-center text-sm text-blue-600">
                <span>+ Serviço ({companyInfo.service_fee}%)</span>
                <span className="font-bold">
                  R$ {(sale.total * (companyInfo.service_fee / 100)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-2 gap-3 shrink-0">
          
          <button 
            onClick={onAddItems} 
            className="col-span-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <Plus size={20}/> 
            {isReserved ? 'Iniciar Atendimento' : 'Adicionar Itens'}
          </button>
          
          <button 
            onClick={onPrintBill} 
            disabled={sale.total <= 0} 
            className="py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={18}/> Parcial
          </button>
          
          <button 
            onClick={onTransfer} 
            disabled={isReserved} 
            className="py-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft size={18}/> Transferir
          </button>

          <button 
            onClick={onPay} 
            disabled={sale.total <= 0} 
            className="col-span-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DollarSign size={20}/> Fechar Conta (Caixa)
          </button>
        </div>

      </div>
    </div>
  )
}