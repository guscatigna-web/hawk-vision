import React from 'react';
import { formatDateBr } from '../utils/dateUtils'; // Importe a nova função

export function DisciplinaryDocument({ data, employee, company }) {
  const isSuspension = data.type === 'suspensao';
  const title = isSuspension ? 'TERMO DE SUSPENSÃO DISCIPLINAR' : 'ADVERTÊNCIA DISCIPLINAR AO EMPREGADO';
  
  // CORREÇÃO AQUI: Usar formatDateBr para evitar o problema de fuso
  const dateFormatted = formatDateBr(data.date);
  
  const city = data.location || company?.city || 'Local';
  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="print-a4 p-12 font-serif text-black max-w-[210mm] mx-auto bg-white h-full">
      
      {/* TÍTULO */}
      <div className="text-center mb-16">
        <h1 className="text-xl font-bold uppercase border-b-2 border-black inline-block pb-1">
          {title}
        </h1>
      </div>

      {/* CORPO DO TEXTO */}
      <div className="space-y-6 text-justify leading-relaxed text-lg">
        <p>
          Sr(a). <span className="font-bold uppercase">{employee.name}</span>,
        </p>

        <p>
          Foi apurado que no dia <span className="font-bold underline">{dateFormatted}</span> Vossa Senhoria cometeu a falta discriminada abaixo:
        </p>

        <div className="border border-black p-4 my-4 bg-gray-50 italic">
          "{data.description}"
        </div>

        <p>
          Em virtude deste fato, decidimos lhe aplicar a pena de 
          <span className="font-bold uppercase"> {isSuspension ? 'SUSPENSÃO' : 'ADVERTÊNCIA'} </span>
          {!isSuspension && (
            <span>
              com fundamento na alínea "e" do artigo 482 da CLT (desídia no desempenho das respectivas funções),
            </span>
          )}
          na intenção de evitar a repetição desta conduta, o que poderia resultar na aplicação de penalidades mais severas{isSuspension ? ' ou até mesmo rescisão por justa causa' : ''}.
        </p>

        <p>
          Sendo o que se apresenta, esperamos manter o bom relacionamento e que este infortúnio seja superado.
        </p>

        <p className="mt-8 text-right">
          {city}, {today}.
        </p>
      </div>

      {/* ASSINATURAS */}
      <div className="mt-20 space-y-16">
        
        {/* EMPREGADO */}
        <div>
          <div className="border-t border-black w-2/3 max-w-sm pt-2">
            <span className="font-bold uppercase">{employee.name}</span>
            <br/>
            <span className="text-sm">Nome do Empregado</span>
          </div>
        </div>

        {/* EMPREGADOR */}
        <div>
          <div className="border-t border-black w-2/3 max-w-sm pt-2">
            <span className="font-bold uppercase">{company?.trade_name || 'Nome da Empresa'}</span>
            <br/>
            <span className="text-sm">CNPJ: {company?.cnpj || '00.000.000/0000-00'}</span>
          </div>
        </div>

        {/* TESTEMUNHAS */}
        <div className="flex justify-between pt-8">
          <div className="w-1/3">
            <div className="border-t border-black w-full pt-2">
              <span className="text-sm uppercase">Testemunha 1</span>
            </div>
          </div>
          <div className="w-1/3">
            <div className="border-t border-black w-full pt-2">
              <span className="text-sm uppercase">Testemunha 2</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}