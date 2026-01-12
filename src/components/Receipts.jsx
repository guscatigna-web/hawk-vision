import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// --- COMPONENTE MÁGICO: PORTAL DE IMPRESSÃO ---
// Joga o conteúdo direto no body, fora da confusão do React/Tailwind
export function PrintPortal({ children }) {
  // Cria o elemento div apenas uma vez
  const [container] = useState(() => {
    const el = document.createElement('div')
    el.id = 'print-portal-root' // Este ID combina com o CSS novo
    return el
  })

  // Monta o elemento no body quando o componente aparece
  useEffect(() => {
    document.body.appendChild(container)
    return () => {
      document.body.removeChild(container)
    }
  }, [container])

  // Renderiza os filhos (o ticket) dentro desse elemento solto
  return createPortal(children, container)
}

// --- 1. TICKET DE COZINHA (KDS/Produção) ---
export function KitchenTicket({ order, station = 'Cozinha' }) {
  if (!order) return null
  
  const itemsToPrint = order.items.filter(item => {
    if (station === 'Geral') return true
    return item.product?.destination ? item.product.destination.toLowerCase() === station.toLowerCase() : true
  })

  if (itemsToPrint.length === 0) return null

  return (
    <div className="printable-ticket-area">
      <div className="ticket-title text-xl border-b-2 border-black pb-1 mb-2">
        {station}
      </div>
      <div className="ticket-row text-xs font-bold mb-4">
        <span>{new Date().toLocaleTimeString().slice(0,5)}</span>
        <span className="uppercase">{order.customer_name}</span>
      </div>
      
      {itemsToPrint.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2 border-b border-dashed border-gray-400 pb-1">
          <span className="font-black text-lg w-8">{item.quantity}</span>
          <div className="flex-1">
            <span className="text-sm font-bold block">{item.product?.name || item.name}</span>
            {item.notes && <span className="text-xs italic">* {item.notes}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// --- 2. PRÉ-CONTA (Conferência Completa) ---
export function PreBillTicket({ order, subtotal, serviceFee, total, company }) {
  if (!order) return null

  return (
    <div className="printable-ticket-area">
      {/* CABEÇALHO DA EMPRESA */}
      <div className="ticket-center mb-4">
        <h2 className="font-bold text-base uppercase">{company?.company_name || 'HAWK VISION'}</h2>
        <div className="text-[10px] leading-tight">
          {company?.cnpj && <p>CNPJ: {company.cnpj}</p>}
          {company?.address && <p>{company.address}</p>}
          {company?.city && <p>{company.city}</p>}
        </div>
      </div>

      <div className="ticket-center border-y border-black py-1 my-2 font-bold text-sm uppercase">
        Conferência de Conta
      </div>

      {/* DADOS DO PEDIDO */}
      <div className="text-[10px] mb-2 uppercase">
        <div className="ticket-row">
          <span>Data:</span>
          <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0,5)}</span>
        </div>
        <div className="ticket-row font-bold">
          <span>Cliente:</span>
          <span>{order.customer_name}</span>
        </div>
        {order.waiter_name && (
          <div className="ticket-row">
            <span>Garçom:</span>
            <span>{order.waiter_name.split(' ')[0]}</span>
          </div>
        )}
      </div>

      <div className="ticket-divider"></div>

      {/* CABEÇALHO ITENS */}
      <div className="ticket-row font-bold text-[10px] mb-1">
        <span style={{width: '10%'}}>QTD</span>
        <span style={{width: '60%'}}>ITEM</span>
        <span style={{width: '30%', textAlign: 'right'}}>TOTAL</span>
      </div>

      {/* LISTA DE ITENS */}
      {(order.items || []).map((item, index) => (
        <div key={index} className="ticket-row text-[10px] mb-1">
          <span style={{width: '10%'}}>{item.quantity}</span>
          <span style={{width: '60%'}} className="truncate">{item.product?.name || item.name}</span>
          <span style={{width: '30%', textAlign: 'right'}}>
            {((item.unit_price || item.product?.price || 0) * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      <div className="ticket-divider"></div>

      {/* TOTAIS */}
      <div className="ticket-row text-xs font-bold">
        <span>SUBTOTAL:</span>
        <span>R$ {subtotal.toFixed(2)}</span>
      </div>
      
      {serviceFee > 0 && (
        <div className="ticket-row text-xs mt-1">
          <span>SERVIÇO (10%):</span>
          <span>R$ {serviceFee.toFixed(2)}</span>
        </div>
      )}

      <div className="ticket-divider"></div>

      <div className="ticket-row text-sm font-black uppercase">
        <span>Total a Pagar:</span>
        <span>R$ {total.toFixed(2)}</span>
      </div>

      <div className="ticket-center text-[10px] mt-6 font-bold">
        *** NÃO É DOCUMENTO FISCAL ***
      </div>
    </div>
  )
}

// --- 3. RECIBO FINAL (Via Cliente) ---
export function CustomerReceipt({ order, company }) {
  if (!order) return null

  return (
    <div className="printable-ticket-area">
      {/* CABEÇALHO */}
      <div className="ticket-center mb-4">
        <h2 className="font-bold text-base uppercase">{company?.company_name || 'HAWK VISION'}</h2>
        <div className="text-[10px] leading-tight">
          {company?.cnpj && <p>CNPJ: {company.cnpj}</p>}
          {company?.address && <p>{company.address}</p>}
        </div>
      </div>

      <div className="text-[10px] mb-2 pb-2 border-b border-dashed border-black">
        <p>PEDIDO: #{String(order.id).slice(0,4).toUpperCase()}</p>
        <p>DATA: {new Date(order.created_at).toLocaleString()}</p>
        {order.payment_method && <p className="uppercase">PAGAMENTO: {order.payment_method}</p>}
      </div>

      {/* ITENS RESUMIDOS */}
      {(order.items || []).map((item, index) => (
        <div key={index} className="ticket-row text-[10px] mb-1">
          <span style={{width: '15%'}}>{item.quantity}x</span>
          <span style={{width: '55%'}}>{item.product?.name || item.name}</span>
          <span style={{width: '30%', textAlign: 'right'}}>
            {((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      <div className="ticket-divider"></div>

      <div className="ticket-row font-black text-sm uppercase">
        <span>Total Pago:</span>
        <span>R$ {Number(order.total).toFixed(2)}</span>
      </div>

      {order.change > 0 && (
        <div className="ticket-row text-xs mt-1">
          <span>TROCO:</span>
          <span>R$ {Number(order.change).toFixed(2)}</span>
        </div>
      )}

      <div className="ticket-center text-[10px] mt-6">
        Obrigado pela preferência!
      </div>
    </div>
  )
}