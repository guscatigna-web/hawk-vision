import React from 'react';

// Agora aceita um ARRAY de tickets (ex: [{items: [], sector: 'COZINHA'}, {items: [], sector: 'BAR'}])
export const KitchenTicket = ({ tickets, tableNumber, date, waiter }) => {
  return (
    <div className="kitchen-ticket-print" style={{ display: 'none' }}>
      
      {tickets.map((ticket, index) => (
        <div key={index}>
          <div className="ticket-header">
            {/* TÍTULO DINÂMICO: COZINHA ou BAR */}
            <h1 style={{fontSize: '24px', fontWeight: '900', textAlign: 'center'}}>{ticket.sector}</h1>
            <p style={{textAlign: 'center'}}>MESA {tableNumber}</p>
            <p style={{textAlign: 'center', fontSize: '12px'}}>Garçom: {waiter}</p>
            <p style={{textAlign: 'center', fontSize: '10px'}}>{date}</p>
          </div>

          <hr className="dashed-line" />

          <div className="ticket-body">
            {ticket.items.map((item, idx) => (
              <div key={idx} className="item-row">
                <span className="qty">{item.quantity}x</span>
                <span className="prod-name">{item.product.name}</span>
                {/* Se quiser mostrar observações, adicione aqui */}
              </div>
            ))}
          </div>

          <hr className="dashed-line" />
          
          {/* Se houver mais de um ticket e não for o último, força quebra de página */}
          {index < tickets.length - 1 && (
            <div className="page-break"></div>
          )}
        </div>
      ))}

    </div>
  );
};