import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, AlertTriangle, Link as LinkIcon, ArrowRight, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function IfoodMenu() {
  const [loading, setLoading] = useState(false);
  const [ifoodItems, setIfoodItems] = useState([]);
  const [erpProducts, setErpProducts] = useState([]);
  const [mappings, setMappings] = useState({}); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dataOrigin, setDataOrigin] = useState(null); // 'API' | 'MOCKUP' | null

  // Carregar dados ao montar a tela
  useEffect(() => {
    loadData();
    // A linha de "disable" foi removida aqui, pois o ESLint já aceitou a dependência vazia.
  }, []);

  const loadData = async () => {
    setLoading(true);
    console.log("🔄 [IfoodMenu] Iniciando carregamento...");

    try {
      // 1. Identificar Usuário e Empresa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      const searchCol = isUUID ? 'auth_user_id' : 'id';

      const { data: emp } = await supabase
        .from('employees')
        .select('company_id')
        .eq(searchCol, user.id)
        .maybeSingle();

      let companyId = emp?.company_id || user.user_metadata?.company_id;
      if (!companyId && String(user.id) === '10') companyId = 1;

      if (!companyId) throw new Error("Empresa não identificada.");

      // 2. Buscar Cardápio iFood
      console.log("📡 Chamando Edge Function /menu...");
      const { data: ifoodData, error: ifoodError } = await supabase.functions.invoke('ifood-proxy/menu', {
        body: { companyId }
      });

      if (ifoodError) throw new Error("Falha na comunicação com iFood.");

      // --- LÓGICA DA VERDADE (API vs MOCKUP) ---
      if (ifoodData?.items && ifoodData.items.length > 0) {
        setIfoodItems(ifoodData.items);
        setDataOrigin('API');
        console.log("✅ Dados reais do iFood carregados!");
      } else {
        console.warn("⚠️ Menu iFood vazio. Ativando Mockup para teste visual.");
        setDataOrigin('MOCKUP');
        setIfoodItems([
          { id: 'mock-1', name: '🔥 X-Burger (TESTE)', price: 25.00, category: 'Lanches', status: 'AVAILABLE' },
          { id: 'mock-2', name: '🥤 Coca-Cola (TESTE)', price: 8.00, category: 'Bebidas', status: 'AVAILABLE' },
          { id: 'mock-3', name: '🍟 Batata Frita (TESTE)', price: 15.00, category: 'Acompanhamentos', status: 'PAUSED' },
        ]);
      }

      // 3. Buscar Produtos do ERP
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');
      
      setErpProducts(products || []);

      // 4. Buscar Mapeamentos
      const { data: existingMaps } = await supabase
        .from('ifood_menu_mapping')
        .select('ifood_product_id, erp_product_id')
        .eq('company_id', companyId);

      const mapObj = {};
      existingMaps?.forEach(m => {
        mapObj[m.ifood_product_id] = m.erp_product_id;
      });
      setMappings(mapObj);

    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = async (ifoodId, erpId) => {
    setMappings(prev => ({ ...prev, [ifoodId]: erpId }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      const searchCol = isUUID ? 'auth_user_id' : 'id';
      const { data: emp } = await supabase.from('employees').select('company_id').eq(searchCol, user.id).maybeSingle();
      let companyId = emp?.company_id || user.user_metadata?.company_id || (String(user.id) === '10' ? 1 : null);

      if (!erpId) {
        await supabase
            .from('ifood_menu_mapping')
            .delete()
            .eq('company_id', companyId)
            .eq('ifood_product_id', ifoodId);
        toast.success("Vínculo removido");
      } else {
        await supabase
            .from('ifood_menu_mapping')
            .upsert({
                company_id: companyId,
                ifood_product_id: ifoodId,
                erp_product_id: erpId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'company_id, ifood_product_id' });
        toast.success("Salvo com sucesso!");
      }
    } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar vínculo");
    }
  };

  const filteredItems = ifoodItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <LinkIcon className="text-red-500"/> Vínculo de Cardápio
            </h1>
            <p className="text-sm text-slate-500">Conecte os produtos do iFood ao seu Estoque.</p>
        </div>
        <button onClick={loadData} disabled={loading} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
            {loading ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
            Atualizar Lista
        </button>
      </div>

      {dataOrigin === 'MOCKUP' && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
           <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" />
           <div>
              <h3 className="font-bold text-yellow-800">Modo de Teste Ativo (Mockup)</h3>
              <p className="text-sm text-yellow-700">
                Conexão com iFood foi bem sucedida, mas sua loja lá está <strong>sem produtos cadastrados</strong>. 
                Mostrando itens fictícios para você testar o vínculo.
              </p>
           </div>
        </div>
      )}

      {dataOrigin === 'API' && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800 font-medium">
           <Database size={16} />
           Dados reais sincronizados do iFood.
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
        <input 
            type="text" 
            placeholder="Buscar item do iFood..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200 custom-scrollbar">
        {loading && ifoodItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={32}/>
                <p>Buscando cardápio na API...</p>
            </div>
        ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p>Nenhum item encontrado.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-12 bg-slate-50 p-3 text-xs font-bold text-slate-500 uppercase sticky top-0 z-10">
                    <div className="col-span-4">Produto iFood</div>
                    <div className="col-span-2 text-center">Preço iFood</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-5">Produto no Sistema (ERP)</div>
                </div>
                
                {filteredItems.map(item => {
                    const linkedId = mappings[item.id];
                    return (
                        <div key={item.id} className={`grid grid-cols-12 p-4 items-center hover:bg-slate-50 transition-colors ${linkedId ? 'bg-green-50/30' : ''}`}>
                            <div className="col-span-4">
                                <p className="font-bold text-slate-800">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.category} • {item.status === 'AVAILABLE' ? '🟢 Ativo' : '🔴 Pausado'}</p>
                            </div>
                            <div className="col-span-2 text-center font-mono text-slate-600">
                                R$ {item.price.toFixed(2)}
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <ArrowRight size={16} className={linkedId ? "text-green-500" : "text-slate-300"}/>
                            </div>
                            <div className="col-span-5">
                                <select 
                                    className={`w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all cursor-pointer
                                        ${linkedId 
                                            ? 'border-green-200 bg-white text-green-800 font-medium focus:ring-green-500' 
                                            : 'border-slate-200 bg-slate-50 text-slate-400 focus:ring-red-500'}`}
                                    value={linkedId || ""}
                                    onChange={(e) => handleMappingChange(item.id, e.target.value)}
                                >
                                    <option value="">🚫 Não Vinculado (Item Avulso)</option>
                                    {erpProducts.map(prod => (
                                        <option key={prod.id} value={prod.id}>
                                            📦 {prod.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
         <AlertCircle size={14} className="text-blue-500"/>
         <span>Dica: Vincule produtos para que a venda no iFood dê baixa automática no seu estoque do Hawk Vision.</span>
      </div>
    </div>
  );
}