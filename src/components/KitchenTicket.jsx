import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// --- 1. O PORTAL MÁGICO (Versão Otimizada) ---
const PrintPortal = ({ children }) => {
  // CORREÇÃO: Criamos o elemento HTML dentro do useState.
  // Isso garante que ele exista na primeira renderização, evitando o erro de "cascading render".
  const [mountNode] = useState(() => {
    const el = document.createElement('div');
    el.id = 'print-portal-root';
    return el;
  });

  useEffect(() => {
    // Apenas anexamos ao body quando o componente monta
    document.body.appendChild(mountNode);
    
    // Removemos quando desmonta
    return () => {
      if (document.body.contains(mountNode)) {
        document.body.removeChild(mountNode);
      }
    };
  }, [mountNode]);

  // Renderiza os filhos dentro desse nó isolado
  return createPortal(children, mountNode);
};

// --- 2. O COMPONENTE DE TICKET ---
export const KitchenTicket = ({ tickets, tableNumber, waiter, orderInfo, date }) => {
  if (!tickets || tickets.length === 0) return null;

  const displayInfo = orderInfo || {
      type: 'MESA',
      identifier: tableNumber || 'BALCÃO',
      waiter: waiter || 'Garçom'
  };

  return (
    <PrintPortal>
      {/* CSS Específico injetado direto no momento da impressão */}
      <style>
        {`
          /* Esconde o portal na tela normal para não atrapalhar o uso */
          #print-portal-root {
            display: none; 
          }

          @media print {
            /* 1. Esconde TUDO que existe na página normal */
            body > *:not(#print-portal-root) {
              display: none !important;
            }

            /* 2. Garante que o body ocupe tudo */
            body {
              margin: 0;
              padding: 0;
              height: auto;
              overflow: visible;
            }

            /* 3. Mostra o nosso portal */
            #print-portal-root {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              background: white;
              visibility: visible;
            }

            /* Estilização do Ticket (Térmica 80mm) */
            .ticket-container {
               width: 80mm; 
               margin-bottom: 30px;
               border-bottom: 2px dashed #000;
               padding-bottom: 20px;
               page-break-inside: avoid;
               font-family: 'Courier New', monospace;
               color: black;
            }
            
            .header { text-align: center; margin-bottom: 15px; }
            .sector-title { font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; }
            .order-id { font-size: 18px; font-weight: bold; margin: 5px 0; }
            .info { font-size: 12px; margin: 2px 0; }
            
            .dashed-line { 
                border-top: 1px dashed #000; 
                margin: 10px 0; 
                display: block; 
            }
            
            .item-row { 
              display: flex; 
              font-size: 14px; 
              font-weight: bold; 
              margin-bottom: 5px; 
            }
            .qty { width: 30px; }
            .prod-name { flex: 1; }
          }
        `}
      </style>

      {/* Conteúdo do Ticket */}
      <div>
        {tickets.map((ticket, index) => (
          <div key={index} className="ticket-container">
            <div className="header">
              <h1 className="sector-title">{ticket.sector}</h1>
              
              <p className="order-id">
                  {displayInfo.type === 'IFOOD' 
                      ? `IFOOD #${displayInfo.identifier}` 
                      : `MESA ${displayInfo.identifier}`}
              </p>

              {displayInfo.customer && <p className="info">Cliente: {displayInfo.customer.slice(0, 25)}</p>}
              <p className="info">{date || new Date().toLocaleString()}</p>
              {displayInfo.waiter && <p className="info" style={{fontSize: '10px'}}>Resp: {displayInfo.waiter}</p>}
            </div>

            <div className="dashed-line" />

            <div className="ticket-body">
              {ticket.items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <span className="qty">{item.quantity}x</span>
                  <span className="prod-name">{item.product?.name || 'Item s/ nome'}</span>
                </div>
              ))}
            </div>
            
            <div className="dashed-line" />
            <p style={{textAlign: 'center', fontSize: '10px', marginTop: '5px'}}>Hawk Vision Sistema</p>
          </div>
        ))}
      </div>
    </PrintPortal>
  );
};