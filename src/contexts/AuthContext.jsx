/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // Dados do Supabase Auth (email, id, etc)
  const [employee, setEmployee] = useState(null); // Dados de negócio (nome, cargo, company_id)
  const [loading, setLoading] = useState(true);
  
  // NOVO: Estado para armazenar o usuário Master original quando estiver acessando outra loja
  const [originalMasterUser, setOriginalMasterUser] = useState(null);

  useEffect(() => {
    // 1. Verifica sessão ativa ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmployeeProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Escuta mudanças de estado (Login/Logout em outras abas ou expiração)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchEmployeeProfile(session.user);
      } else {
        setEmployee(null);
        setOriginalMasterUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchEmployeeProfile(authUser) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error) {
        // Se não achar funcionário, pode ser o primeiro login ou erro
        console.error('Perfil de funcionário não encontrado:', error);
      }

      // --- LÓGICA DE IMPERSONATION (ACESSO MASTER) ---
      // Verifica se existe um acesso "mascarado" salvo no navegador
      const storedImpersonation = localStorage.getItem('hawk_impersonation');
      
      if (storedImpersonation && data?.role === 'Master') {
          const targetCompany = JSON.parse(storedImpersonation);
          
          // Salva os dados reais do Master
          setOriginalMasterUser(data);
          
          // Define o funcionário "falso" com os dados da loja alvo
          setEmployee({
              ...data, // Mantém nome/email do Master
              company_id: targetCompany.id, // Injeta ID da loja cliente
              company_name: targetCompany.name,
              role: 'Gerente', // Rebaixa para Gerente para ver o painel da loja
              is_impersonating: true
          });
          console.log(`🔒 Modo Master: Acessando ${targetCompany.name}`);
      } else {
          // Vida normal
          setEmployee(data);
          // Se não estiver impersonando, garante que limpa sujeira antiga
          if (data?.role === 'Master') {
             setOriginalMasterUser(null);
          }
      }

    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  // --- LOGIN ---
  async function signIn(email, password) {
    try {
      setLoading(true);
      
      // 1. Autentica no Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. O useEffect vai disparar o fetchEmployeeProfile automaticamente
      // Mas retornamos sucesso aqui para a UI
      toast.success("Login realizado!");
      return data;

    } catch (error) {
      console.error(error);
      toast.error("Email ou senha incorretos.");
      setLoading(false);
      return null;
    }
  }

  // --- LOGOUT ---
  async function signOut() {
    try {
      // Limpa qualquer impersonation ao sair
      localStorage.removeItem('hawk_impersonation');
      
      await supabase.auth.signOut();
      setEmployee(null);
      setUser(null);
      setSession(null);
      setOriginalMasterUser(null);
      toast.success("Saiu do sistema.");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  // --- FUNÇÕES DE MASTER (NOVO) ---
  
  const impersonateCompany = async (targetCompany) => {
    if (employee?.role !== 'Master' && !originalMasterUser) {
        toast.error('Permissão negada.');
        return;
    }

    // Salva no Storage para persistir após reload
    localStorage.setItem('hawk_impersonation', JSON.stringify({
        id: targetCompany.id,
        name: targetCompany.name
    }));

    toast.loading(`Acessando ${targetCompany.name}...`);
    
    // Força um reload para garantir que todos os componentes (Querys, Contextos)
    // peguem o novo company_id limpo desde o início.
    setTimeout(() => {
        window.location.href = '/'; 
    }, 500);
  };

  const exitImpersonation = () => {
    localStorage.removeItem('hawk_impersonation');
    toast.loading('Voltando para o QG...');
    
    setTimeout(() => {
        window.location.href = '/master-dashboard';
    }, 500);
  };

  // O "user" exportado agora combina dados de Auth + Dados de Funcionário para compatibilidade
  const combinedUser = employee ? { ...employee, auth_id: user?.id } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
        session, 
        user: combinedUser, 
        loading, 
        signIn, 
        signOut,
        // Novos exports para Master
        impersonateCompany,
        exitImpersonation,
        isImpersonating: !!originalMasterUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}