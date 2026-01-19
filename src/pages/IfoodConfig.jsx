import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../lib/supabase'; 

import { Store, Link as LinkIcon, Save, Loader2, CheckCircle, AlertCircle, RefreshCw, HelpCircle, ArrowRight, DollarSign } from 'lucide-react';

export default function IfoodConfig() {
  const navigate = useNavigate(); 
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userCode, setUserCode] = useState('');
  const [verifier, setVerifier] = useState('');
  const [status, setStatus] = useState('DISCONNECTED'); 
  const [merchantDetails, setMerchantDetails] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // URL Base das Funções
  const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ifood-proxy`;

  const getCompanyId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('auth_user_id', user.id)
      .maybeSingle(); 

    return employee?.company_id;
  }, []);

  const checkStatus = useCallback(async () => {
    setVerifying(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) return;

      const { data } = await supabase
        .from('integrations_ifood')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (data && data.status === 'CONNECTED') {
        setStatus('CONNECTED');
        setMerchantDetails({
          id: data.merchant_id,
          lastSync: data.last_synced_at
        });
      } else {
        setStatus('DISCONNECTED');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setVerifying(false);
    }
  }, [getCompanyId]); 

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 1. INICIAR AUTORIZAÇÃO
  const handleStartAuth = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${FUNCTIONS_URL}/init-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'init-auth' }) // Garantindo action no body
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao iniciar auth');
      }

      const data = await response.json();

      if (!data.url) throw new Error('URL de autorização não retornada');

      setVerifier(data.verifier); 
      window.open(data.url, '_blank');
      
      setTimeout(() => setShowHelp(true), 3000);

    } catch (error) {
      console.error(error);
      alert('Erro ao gerar link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. SALVAR CÓDIGO
  const handleSaveCode = async () => {
    if (!userCode) return alert('Por favor, cole o código.');
    if (!verifier) return alert('Sessão expirada. Clique em "Abrir Portal" novamente.');
    
    setLoading(true);
    try {
      const companyId = await getCompanyId();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${FUNCTIONS_URL}/exchange`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'exchange', // Garantindo action no body
          authCode: userCode, 
          companyId, 
          verifier 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao trocar token');
      }

      alert('Conectado com sucesso! Loja ID: ' + result.merchantId);
      setUserCode('');
      checkStatus(); 

    } catch (error) {
      console.error(error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Store className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integração iFood</h1>
          <p className="text-gray-500">Conecte sua loja para receber pedidos no Hawk Vision.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cartão de Status */}
        <div className={`p-6 rounded-xl border-2 ${status === 'CONNECTED' ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Status da Conexão</h3>
            {status === 'CONNECTED' ? 
              <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-bold flex items-center gap-2">
                <CheckCircle size={16} /> CONECTADO
              </span> :
              <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-bold">DESCONECTADO</span>
            }
          </div>
          
          {status === 'CONNECTED' && (
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Merchant ID:</strong> {merchantDetails?.id}</p>
              <p><strong>Última Sincronização:</strong> {new Date(merchantDetails?.lastSync).toLocaleString()}</p>
              
              <div className="pt-4 mt-4 border-t border-green-200 space-y-2">
                {/* Botão de Vinculação */}
                <button 
                  onClick={() => navigate('/ifood-menu')}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center gap-2 transition-colors shadow-sm"
                >
                  <span className="text-lg">🍔</span> 
                  Vincular Produtos do Cardápio
                  <ArrowRight size={16} />
                </button>

                {/* NOVO: Botão de Gestão de Preços e Pausas */}
                <button 
                  onClick={() => navigate('/ifood-cardapio')}
                  className="w-full bg-white text-indigo-700 border border-indigo-200 py-2 px-4 rounded-lg font-medium hover:bg-indigo-50 flex justify-center items-center gap-2 transition-colors shadow-sm"
                >
                  <DollarSign size={16} /> 
                  Gerenciar Preços e Pausas
                  <ArrowRight size={16} />
                </button>
              </div>

              <button 
                onClick={checkStatus}
                className="mt-2 w-full text-indigo-600 hover:text-indigo-800 flex justify-center items-center gap-2 text-sm font-medium p-2"
              >
                <RefreshCw size={14} /> Atualizar Status
              </button>
            </div>
          )}

          {status === 'DISCONNECTED' && (
            <div className="text-gray-500 text-sm">
              <p className="mb-4">Sua loja ainda não está recebendo pedidos automaticamente.</p>
              <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded text-yellow-800 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>Para conectar, autorize o aplicativo no Portal do iFood.</p>
              </div>
            </div>
          )}
        </div>

        {/* Cartão de Ação (Conexão) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Configurar Nova Conexão</h3>
          
          <div className="space-y-6">
            {/* Passo 1 */}
            <div className="relative pl-8 border-l-2 border-indigo-100 pb-2">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-sm font-medium text-gray-900 mb-2">Obter Código de Autorização</p>
              
              <button
                onClick={handleStartAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200 mb-2"
              >
                <LinkIcon size={16} />
                Abrir Portal iFood
              </button>

              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-indigo-600 underline flex items-center gap-1 hover:text-indigo-800"
              >
                <HelpCircle size={12} />
                O código não apareceu?
              </button>

              {showHelp && (
                <div className="mt-3 bg-slate-50 p-3 rounded text-xs text-slate-700 border border-slate-200">
                  <p className="font-bold mb-1">Como encontrar manualmente:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>No Portal do Parceiro, vá em <strong>Apps</strong>.</li>
                    <li>Busque por <strong>Hawk Vision</strong>.</li>
                    <li>Clique em <strong>Autorizar</strong>.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Passo 2 */}
            <div className="relative pl-8 border-l-2 border-indigo-100">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-sm font-medium text-gray-900 mb-2">Confirmar Código</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder="Ex: WXYZ-1234"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-center font-mono text-sm"
                />
                <button
                  onClick={handleSaveCode}
                  disabled={loading || !userCode}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium text-sm"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}