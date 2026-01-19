import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DollarSign, Eye, EyeOff, RefreshCw, Save, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function CardapioIfood() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null) 
  const { user } = useAuth()

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const { data: emp } = await supabase.from('employees').select('company_id').eq('auth_user_id', user.id).maybeSingle();
      const companyId = emp?.company_id || user.user_metadata?.company_id || 1;

      const { data, error } = await supabase.functions.invoke('ifood-proxy', {
        body: { action: 'menu', companyId }
      });

      if (error) throw error;

      const formattedItems = (data.items || []).map(i => ({ ...i, newPrice: i.price }));
      setItems(formattedItems);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar cardápio iFood");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleUpdate = async (item, type) => {
    setUpdating(item.id);
    const toastId = toast.loading("Atualizando iFood...");

    try {
        const { data: emp } = await supabase.from('employees').select('company_id').eq('auth_user_id', user.id).single();
        const companyId = emp?.company_id || 1;

        let payload = {
            action: 'manual-catalog-update',
            companyId,
            ifoodProductId: item.id,
            updateType: type 
        };

        if (type === 'status') {
            payload.value = item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
        } else if (type === 'price') {
            payload.value = Number(item.newPrice);
        }

        const { data, error } = await supabase.functions.invoke('ifood-proxy', { body: payload });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast.success("Atualizado com sucesso!", { id: toastId });
        
        setItems(prev => prev.map(i => {
            if (i.id === item.id) {
                if (type === 'status') return { ...i, status: payload.value };
                if (type === 'price') return { ...i, price: payload.value };
            }
            return i;
        }));

    } catch (error) {
        console.error(error);
        toast.error(`Erro: ${error.message}`, { id: toastId });
    } finally {
        setUpdating(null);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-6 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Store className="w-8 h-8 text-red-500" />
                Gestão de Cardápio iFood
            </h1>
            <p className="text-slate-500 text-sm">Controle de disponibilidade e preços em tempo real</p>
        </div>
        <button onClick={fetchMenu} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""}/> Atualizar Lista
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-4">
            {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">Carregando cardápio...</div>
            ) : items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <p>Nenhum produto encontrado na loja iFood.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase">Categoria</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase">Preço (R$)</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3 font-medium text-slate-700">{item.name}</td>
                                <td className="p-3 text-slate-500 text-sm">{item.category}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                                        item.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        {item.status === 'AVAILABLE' ? '🟢 Ativo' : '🔴 Pausado'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 text-sm">R$</span>
                                        <input 
                                            type="number" step="0.01"
                                            className="border border-slate-300 rounded px-2 py-1 w-24 text-right font-mono focus:border-red-500 outline-none"
                                            value={item.newPrice}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setItems(prev => prev.map(i => i.id === item.id ? {...i, newPrice: val} : i));
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        {Number(item.newPrice) !== Number(item.price) && (
                                            <button disabled={updating === item.id} onClick={() => handleUpdate(item, 'price')} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors" title="Salvar Novo Preço"><Save size={16}/></button>
                                        )}
                                        <button disabled={updating === item.id} onClick={() => handleUpdate(item, 'status')} className={`p-2 rounded transition-colors border ${item.status === 'AVAILABLE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`} title={item.status === 'AVAILABLE' ? "Pausar Item" : "Ativar Item"}>
                                            {item.status === 'AVAILABLE' ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  )
}