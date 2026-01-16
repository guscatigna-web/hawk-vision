import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Loader2, Search, AlertTriangle, Link as LinkIcon, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function IfoodMenu() {
  const [loading, setLoading] = useState(false);
  const [ifoodItems, setIfoodItems] = useState([]);
  const [erpProducts, setErpProducts] = useState([]);
  const [mappings, setMappings] = useState({}); // { ifood_id: erp_id }
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar dados ao montar a tela
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    console.log("🔄 [IfoodMenu] Iniciando carregamento de dados...");

    try {
      // 1. Identificar Usuário e Empresa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .single();

      if (empError || !emp?.company_id) {
        throw new Error("Empresa não identificada para este usuário.");
      }

      const companyId = emp.company_id;

      // 2. Buscar Produtos do ERP (Hawk Vision)
      // CORREÇÃO APLICADA: Filtro por 'type' = 'sale' e 'active' = true
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('company_id', companyId)
        .eq('type', 'sale')       // <-- Correção solicitada (filtra produtos de venda)
        .eq('active', true);      // <-- Boa prática: apenas produtos ativos
      
      if (prodError) throw new Error("Erro ao buscar produtos locais: " + prodError.message);
      
      setErpProducts(products || []);
      console.log(`📦 [IfoodMenu] ${products?.length || 0} produtos locais carregados.`);

      // 3. Buscar Mapeamentos Existentes
      const { data: existingMaps, error: mapError } = await supabase
        .from('ifood_menu_mapping')
        .select('ifood_product_id, erp_product_id')
        .eq('company_id', companyId);

      if (mapError) throw new Error("Erro ao buscar mapeamentos: " + mapError.message);

      const mapObj = {};
      existingMaps?.forEach(m => {
        mapObj[m.ifood_product_id] = m.erp_product_id;
      });
      setMappings(mapObj);

      // 4. Buscar Cardápio do iFood (Via Edge Function)
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const FUNCTION_URL = `${baseUrl}/functions/v1/ifood-proxy/menu`;

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyId })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erro API iFood (${res.status}): ${errText}`);
      }
      
      const menuData = await res.json();
      let finalItems = menuData.items || [];
      console.log(`🍔 [IfoodMenu] ${finalItems.length} itens recebidos do iFood.`);

      // === MOCK DE TESTE (Se vier vazio) ===
      if (finalItems.length === 0) {
        console.warn("⚠️ [IfoodMenu] Lista vazia! Usando MOCK para teste.");
        finalItems = [
          { id: 'mock-1', name: '🍔 X-Burger (Teste)', price: 29.90, category: 'Lanches', status: 'AVAILABLE' },
          { id: 'mock-2', name: '🥤 Coca-Cola Lata', price: 6.50, category: 'Bebidas', status: 'AVAILABLE' },
          { id: 'mock-3', name: '🍟 Batata Frita G', price: 18.00, category: 'Acompanhamentos', status: 'AVAILABLE' }
        ];
        toast('Modo Teste: Exibindo itens simulados.', { icon: '🧪' });
      }
      // =====================================

      setIfoodItems(finalItems);

    } catch (error) {
      console.error("🔥 [IfoodMenu] ERRO:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (ifoodId, erpId) => {
    setMappings(prev => ({
      ...prev,
      [ifoodId]: erpId 
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: emp } = await supabase.from('employees').select('company_id').eq('auth_user_id', user.id).single();
      
      const updates = Object.entries(mappings).map(([ifoodId, erpId]) => ({
        company_id: emp.company_id,
        ifood_product_id: ifoodId,
        erp_product_id: erpId || null, 
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('ifood_menu_mapping')
        .upsert(updates, { onConflict: 'ifood_product_id, company_id' });

      if (error) throw error;
      toast.success("Vínculos salvos com sucesso!");

    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = ifoodItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LinkIcon className="text-red-500" /> Vínculo de Cardápio
          </h1>
          <p className="text-gray-500">Relacione os produtos do iFood com o seu estoque interno.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={loadData} 
                className="p-2 text-gray-500 hover:text-indigo-600 border rounded-lg hover:bg-gray-50"
                title="Recarregar dados"
            >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Salvar Alterações
            </button>
        </div>
      </header>

      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
        <Search className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar item do iFood..." 
          className="flex-1 outline-none text-gray-700"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 p-4 font-semibold text-gray-700 text-sm">
          <div className="col-span-5">Produto no iFood</div>
          <div className="col-span-2 text-center">Preço iFood</div>
          <div className="col-span-5">Produto no Hawk Vision (Estoque)</div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredItems.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
                Nenhum item carregado. Verifique o console (F12) se houver erros.
            </div>
          )}

          {filteredItems.map(item => {
            const isLinked = !!mappings[item.id];
            
            return (
              <div key={item.id} className={`grid grid-cols-12 p-4 items-center hover:bg-gray-50 transition-colors ${!isLinked ? 'bg-red-50/30' : ''}`}>
                
                {/* Lado Esquerdo: iFood */}
                <div className="col-span-5 pr-4">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">
                    {item.category}
                  </div>
                </div>

                {/* Centro: Preço */}
                <div className="col-span-2 text-center text-sm text-gray-600">
                  R$ {item.price.toFixed(2)}
                </div>

                {/* Lado Direito: Dropdown ERP */}
                <div className="col-span-5 flex items-center gap-2">
                  <ArrowRight size={16} className="text-gray-300" />
                  <select
                    className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none
                      ${isLinked ? 'border-gray-300 bg-white' : 'border-red-300 bg-white'}`}
                    value={mappings[item.id] || ""}
                    onChange={(e) => handleMappingChange(item.id, e.target.value)}
                  >
                    <option value="">-- Não Vinculado --</option>
                    {erpProducts.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (R$ {prod.price})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {!loading && ifoodItems.length > 0 && (
         <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg flex gap-2 text-sm">
           <AlertTriangle size={18} />
           <p>Dica: Itens "Não Vinculados" entrarão no sistema apenas com o nome do iFood.</p>
         </div>
      )}
    </div>
  );
}