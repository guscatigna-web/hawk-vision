import React, { useState } from 'react';
import { MapPin, Calendar, X, AlertTriangle, CheckCircle, Info } from 'lucide-react'; 

export function NewOccurrenceModal({ isOpen, onClose, employeeName, companyConfig, onSave }) {
  // Configuração Segura
  const safeConfig = companyConfig || {};
  const defaultCity = safeConfig.city || ''; 
  
  const [location, setLocation] = useState(defaultCity);
  const [type, setType] = useState('elogio'); 
  const [dateFact, setDateFact] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const resetFields = () => {
    setType('elogio');
    setDateFact('');
    setDescription('');
    setLocation(defaultCity);
    setIsSubmitting(false);
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

  const handleSave = async () => {
    const isSevere = type === 'escrita' || type === 'suspensao';
    
    // Validação da Data
    let finalDate = dateFact;
    if (!finalDate) {
      if (isSevere) {
        alert("Para medidas disciplinares, a data do fato é obrigatória.");
        return;
      }
      // Se não preencheu e não é grave, assume hoje
      finalDate = new Date().toISOString().split('T')[0]; 
    }

    if (isSevere && !location) {
      alert("Por favor, preencha o Local (Cidade) para o documento.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      type,
      // Mapeando para a coluna 'date' do seu banco (conforme print)
      date: finalDate,  
      description: description || (type === 'elogio' ? 'Elogio registrado.' : 'Sem descrição.'),
      location: location,
      severity: getSeverity(type),
    };
    
    await onSave(payload);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {isPositive ? <CheckCircle className="text-green-600" size={20}/> : 
             isSevere ? <AlertTriangle className="text-red-600" size={20}/> : 
             <Info className="text-blue-600" size={20}/>}
            Nova Ocorrência
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colaborador</label>
            <div className="font-bold text-gray-800 text-lg">{employeeName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Registro</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
            >
              <optgroup label="Positivo">
                <option value="elogio">🌟 Elogio / Bom Desempenho</option>
              </optgroup>
              <optgroup label="Administrativo">
                <option value="atraso">⏰ Atraso</option>
                <option value="falta">📅 Falta Injustificada</option>
                <option value="atestado">⚕️ Atestado Médico</option>
              </optgroup>
              <optgroup label="Disciplinar">
                <option value="verbal">🗣️ Advertência Verbal</option>
                <option value="escrita">📝 Advertência Escrita</option>
                <option value="suspensao">🚫 Suspensão</option>
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'atestado' ? 'Data do Atestado' : 'Data do Ocorrido'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateFact}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDateFact(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 outline-none focus:border-blue-500"
                />
                <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
              </div>
            </div>
            
            {/* Campo Local */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Loja Matriz"
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 outline-none focus:border-blue-500"
                  />
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isSevere ? 'Descrição Detalhada (Jurídico)' : 'Observação / Motivo'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={
                isPositive ? "Ex: Demonstrou proatividade no atendimento..." :
                type === 'atraso' ? "Ex: Chegou 30min atrasado sem aviso prévio..." :
                "Descreva os detalhes do fato..."
              }
            />
          </div>

          {isSevere && (
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex gap-3 items-start">
              <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-orange-800">
                <span className="font-bold">Atenção:</span> Este registro tem valor legal. Certifique-se de que a data e a descrição estão exatas para a geração do termo.
              </div>
            </div>
          )}

        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button 
            onClick={handleClose} 
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm transition-all active:scale-95 ${getThemeColor()}`}
          >
            {isSubmitting ? 'Salvando...' : (isSevere ? 'Registrar Ocorrência' : 'Salvar Registro')}
          </button>
        </div>

      </div>
    </div>
  );
}