import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { BellRing, X } from 'lucide-react';

export function IfoodPolling() {
  const intervalRef = useRef(null);

  useEffect(() => {
    const startPolling = async () => {
      // 1. Identificar Empresa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emp } = await supabase
        .from('employees')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!emp) return;

      const poll = async () => {
        try {
          // 2. Chamar Edge Function
          const { data, error } = await supabase.functions.invoke('ifood-proxy/polling', {
            body: { companyId: emp.company_id }
          });

          if (error) {
            console.error('Erro polling iFood:', error);
            return;
          }

          // 3. Se houver novos pedidos
          if (data && data.newOrdersCount > 0) {
            // Toca Som
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
            audio.play().catch(() => {});

            // Mostra Notificação (Correção do Erro 't' unused)
            toast.custom((t) => (
              <div 
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-red-500`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <BellRing className="h-10 w-10 text-red-500 animate-pulse" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Novo Pedido iFood!
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {data.newOrdersCount} pedido(s) recebido(s).
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => toast.dismiss(t.id)} // <--- AQUI usamos o 't', resolvendo o erro
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ), { duration: 6000 });
          }

        } catch (err) {
          console.error("Falha na conexão de polling:", err);
        }
      };

      // Executa imediatamente e depois a cada 30s
      poll();
      intervalRef.current = setInterval(poll, 30 * 1000);
    };

    startPolling();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null; // Componente invisível (apenas lógica)
}