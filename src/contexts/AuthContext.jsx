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
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- BUSCA PERFIL DE NEGÓCIO (Com Vínculo Automático) ---
  async function fetchEmployeeProfile(authUser) {
    try {
      // Tenta buscar pelo ID de autenticação já vinculado
      let { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      // MIGRACAO AUTOMÁTICA:
      // Se não achou pelo ID, mas o email bate, vamos vincular agora!
      if (!data && authUser.email) {
        const { data: emailMatch } = await supabase
          .from('employees')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();

        if (emailMatch) {
          // Atualiza o registro do funcionário com o ID do Supabase Auth
          const { data: updated, error: updateError } = await supabase
            .from('employees')
            .update({ auth_user_id: authUser.id })
            .eq('id', emailMatch.id)
            .select()
            .single();
          
          if (!updateError) {
            data = updated;
            console.log("Vínculo de usuário realizado com sucesso para:", authUser.email);
          }
        }
      }

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Logou no Supabase, mas não é um funcionário cadastrado
        console.error("Usuário sem cadastro de funcionário correspondente.");
        await supabase.auth.signOut();
        toast.error("Usuário não vinculado a um funcionário.");
        return;
      }

      if (data.status !== 'Ativo') {
        await supabase.auth.signOut();
        toast.error("Acesso revogado.");
        return;
      }

      setEmployee(data);
    
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
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
      await supabase.auth.signOut();
      setEmployee(null);
      setUser(null);
      setSession(null);
      toast.success("Saiu do sistema.");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  // O "user" exportado agora combina dados de Auth + Dados de Funcionário para compatibilidade
  const combinedUser = employee ? { ...employee, auth_id: user?.id } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: combinedUser, signIn, signOut, loading, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}