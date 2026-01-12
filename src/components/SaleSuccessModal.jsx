import { CheckCircle, Printer, X, FileText, AlertTriangle, ArrowRight } from 'lucide-react'

export function SaleSuccessModal({ isOpen, onClose, onPrint, change, total, lastSaleData }) {
  if (!isOpen) return null

  // Dados Fiscais extraídos do objeto de venda
  const fiscalStatus = lastSaleData?.fiscal_status
  const fiscalPdf = lastSaleData?.fiscal_pdf || lastSaleData?.pdf_url // Compatibilidade

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="text-green-600 w-12 h-12" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">Venda Concluída!</h2>
        <p className="text-slate-500 text-sm mb-6">O pedido foi registrado com sucesso.</p>

        {/* Exibição do Troco em Destaque */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Troco</p>
          <p className={`text-3xl font-extrabold ${change > 0 ? 'text-green-600' : 'text-slate-400'}`}>
            R$ {Number(change).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total da Venda: R$ {Number(total).toFixed(2)}</p>
        </div>

        {/* FEEDBACK FISCAL */}
        {fiscalStatus === 'autorizado' && (
           <div className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-2 rounded-lg mb-6 text-sm flex items-center justify-center gap-2 animate-fade-in">
              <CheckCircle size={16}/> Nota Fiscal Emitida
           </div>
        )}
        {fiscalStatus === 'erro' && (
           <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-2 rounded-lg mb-6 text-sm flex items-center justify-center gap-2 animate-fade-in">
              <AlertTriangle size={16}/> Erro na Nota Fiscal
           </div>
        )}

        <div className="space-y-3">
          {/* BOTÃO NOTA FISCAL (DANFE) - SÓ SE AUTORIZADO */}
          {fiscalStatus === 'autorizado' && fiscalPdf && (
            <a 
              href={fiscalPdf} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <FileText size={20} /> Ver Nota Fiscal (DANFE)
            </a>
          )}

          <button 
            onClick={onPrint}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg"
          >
            <Printer size={20} /> Imprimir Recibo
          </button>

          <button 
            onClick={onClose}
            className="w-full bg-white text-slate-600 border border-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            Nova Venda <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </div>
  )
}