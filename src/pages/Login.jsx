import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase'; // Importe o supabase para checar o status
import { ChefHat, Loader2, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth(); // Importe signOut para expulsar se necessário
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Autenticação Padrão (Verifica Senha)
      const user = await signIn(email, password);
      
      if (user) {
        // 2. TRAVA DE SEGURANÇA (KILL SWITCH)
        // Verifica se o funcionário está "Ativo" na empresa
        const { data: employee, error } = await supabase
          .from('employees')
          .select('status, role, name')
          .eq('auth_user_id', user.id)
          .single();

        // Se houver erro ou status não for 'Ativo', barra o acesso
        if (error || !employee || employee.status !== 'Ativo') {
          await signOut(); // Expulsa o usuário da sessão do Supabase
          throw new Error('Acesso revogado. Contate o gerente.');
        }

        toast.success(`Bem-vindo, ${employee.name.split(' ')[0]}!`);

        // 3. Direcionamento Inteligente (Se passou na trava)
        if (employee.role === 'Cozinha') navigate('/producao'); // Ajuste conforme suas rotas
        else if (employee.role === 'Caixa' || employee.role === 'Garçom') navigate('/vendas');
        else navigate('/'); // Gerente/Master
      }
    } catch (error) {
      console.error("Erro Login:", error);
      toast.error(error.message || "Erro ao acessar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/30 mb-4">
            <ChefHat size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Hawk Vision</h1>
          <p className="text-slate-500">Sistema de Gestão Integrada</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="******"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Acessar Painel'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Protegido por criptografia de ponta a ponta. <br/>
          Acesso restrito a colaboradores autorizados.
        </p>
      </div>
    </div>
  );
}