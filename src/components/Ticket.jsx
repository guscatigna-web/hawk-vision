import React from 'react';

// Este componente aceita:
// - data: objeto com os dados da venda (loja, itens, total, etc)
// - width: string '80mm' (padrão) ou '58mm'
const Ticket = ({ data, width = '80mm' }) => {
  
  // Se o papel for estreito (58mm), usamos uma fonte menor (10px).
  // Se for padrão (80mm), usamos 12px.
  const isSmallPaper = width === '58mm';
  const baseFontSize = isSmallPaper ? 'text-[10px]' : 'text-[12px]';

  return (
    <div 
      className={`printable-ticket-area ${baseFontSize} font-mono leading-tight bg-white text-black`}
      // Força a largura do elemento para coincidir com o papel físico
      style={{ width: width }} 
    >
      
      {/* --- CABEÇALHO --- */}
      <div className="text-center mb-2">
        <h2 className="font-bold uppercase text-lg mb-1">Minha Loja</h2>
        <p>CNPJ: 00.000.000/0001-00</p>
        <p>{new Date().toLocaleString()}</p>
      </div>

      <div className="ticket-divider" />

      {/* --- LISTA DE ITENS --- */}
      <div className="flex flex-col gap-1">
        {/* Verifica se existem itens antes de mapear para evitar erros */}
        {data?.items?.map((item, index) => (
          <div key={index} className="ticket-row">
            {/* Nome do produto (trunca texto muito longo) */}
            <span className="truncate w-1/2 text-left">{item.name}</span>
            {/* Quantidade */}
            <span className="w-1/4 text-right">x{item.qty}</span>
            {/* Preço */}
            <span className="w-1/4 text-right font-bold">
              {Number(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        ))}
      </div>

      <div className="ticket-divider" />

      {/* --- TOTAIS --- */}
      <div className="flex justify-between font-bold text-sm mt-2">
        <span>TOTAL</span>
        <span>
          {data?.total 
            ? Number(data.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
            : 'R$ 0,00'}
        </span>
      </div>

      {/* --- RODAPÉ --- */}
      <div className="mt-4 text-center">
        <p className="font-bold">Obrigado pela preferência!</p>
        <p className="text-[10px] mt-1">Volte sempre</p>
        
        {/* Espaço em branco extra no final para o corte do papel não atingir o texto */}
        <div className="h-8" /> 
      </div>
      
    </div>
  );
};

export default Ticket;