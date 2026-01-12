import React, { useState } from 'react';
import { MapPin, Calendar, FileText, X } from 'lucide-react'; 

export default function NewOccurrenceModal({ isOpen, onClose, employeeName, companyConfig, onSave }) {
  // Configuração Segura: Pega a cidade salva ou deixa em branco para preencher
  const safeConfig = companyConfig || {};
  const defaultCity = safeConfig.city || ''; 
  
  const [location, setLocation] = useState(defaultCity);
  const [type, setType] = useState('elogio'); 
  const [dateFact, setDateFact] = useState(''); 
  const [description, setDescription] = useState(''); 
  
  const printDate = new Date().toLocaleDateString('pt-BR');

  const resetFields = () => {
    setType('elogio');
    setDateFact('');
    setDescription('');
    // Reseta sempre para a cidade configurada
    setLocation(defaultCity);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const getSeverity = (selectedType) => {
    switch (selectedType) {
      case 'elogio': return 'positive';
      case 'suspensao': return 'high';
      case 'escrita': 
      case 'falta': return 'medium';
      case 'verbal': 
      case 'atraso': 
      case 'atestado': return 'low';
      default: return 'low';
    }
  };

  const handleSave = () => {
    const isSevere = type === 'escrita' || type === 'suspensao';
    
    let finalDate = dateFact;
    if (!finalDate) {
      if (isSevere) {
        alert("Para medidas disciplinares, a data do fato é obrigatória.");
        return;
      }
      finalDate = new Date().toISOString(); 
    }

    // Se a cidade estiver vazia, avisa (opcional, mas bom para garantir documento correto)
    if (isSevere && !location) {
      alert("Por favor, preencha o Local (Cidade) para o documento.");
      return;
    }

    const payload = {
      type,
      employeeName,
      dateFact: finalDate,  
      description: description || (type === 'elogio' ? 'Elogio registrado.' : 'Sem descrição.'),
      location: location, // Usa o estado local que pode ter sido editado
      severity: getSeverity(type),
      printDate: new Date().toISOString(),
    };
    
    onSave(payload);
    resetFields();
    onClose();
  };

  if (!isOpen) return null;

  const isSevere = type === 'escrita' || type === 'suspensao';
  const isPositive = type === 'elogio';
  
  const getThemeColor = () => {
    if (isPositive) return 'bg-green-600 hover:bg-green-700';
    if (type === 'atestado') return 'bg-blue-500 hover:bg-blue-600';
    if (isSevere) return 'bg-red-600 hover:bg-red-700';
    return 'bg-orange-500 hover:bg-orange-600'; 
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            Nova Ocorrência: {employeeName}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Registro</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 pl-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <optgroup label="Positivo">
                <option value="elogio">🌟 Elogio / Bom Desempenho</option>
              </optgroup>
              <optgroup label="Controle de Ponto / Administrativo">
                <option value="atraso">⏰ Atraso</option>
                <option value="falta">📅 Falta Injustificada</option>
                <option value="atestado">⚕️ Atestado Médico</option>
              </optgroup>
              <optgroup label="Medidas Disciplinares">
                <option value="verbal">🗣️ Advertência Verbal (Registro)</option>
                <option value="escrita">📝 Advertência Escrita (Formal)</option>
                <option value="suspensao">🚫 Suspensão</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'atestado' ? 'Data do Atestado' : 
               type === 'atraso' ? 'Data do Atraso' :
               type === 'falta' ? 'Data da Falta' :
               'Data do Ocorrido'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFact}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDateFact(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 pl-10 outline-none focus:border-blue-500"
              />
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isSevere ? 'Descrição Detalhada (Jurídico)' : 'Observação / Motivo'}
            </label>
            <textarea
              rows={isSevere ? 4 : 2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500"
              placeholder={
                isPositive ? "Ex: Demonstrou proatividade no projeto X..." :
                type === 'atraso' ? "Ex: Chegou 30min atrasado sem aviso..." :
                type === 'atestado' ? "Ex: Atestado de 2 dias / CID Z00..." :
                "Descreva o ocorrido..."
              }
            />
          </div>

          {/* Se for grave, mostra a cidade que veio da config para confirmar */}
          {isSevere && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-3 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local da Aplicação</label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full border border-gray-300 rounded-md p-2 pl-10 outline-none bg-white"
                  />
                  <MapPin className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
                {!location && <p className="text-xs text-red-500 mt-1">Configure a cidade padrão em Configurações.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data do Documento (Hoje)</label>
                <div className="flex items-center bg-gray-200 p-2 rounded text-gray-600 cursor-not-allowed">
                  <FileText className="mr-2" size={16} />
                  <span>{printDate}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
          <button 
            onClick={handleClose} 
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            className={`px-4 py-2 text-sm text-white rounded shadow-sm transition-colors ${getThemeColor()}`}
          >
            {isSevere ? 'Salvar e Gerar Termo' : 'Registrar'}
          </button>
        </div>

      </div>
    </div>
  );
}