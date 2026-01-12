/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserFromStorage() {
      try {
        const storedUser = localStorage.getItem('hawk_user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // VERIFICAÇÃO DE SEGURANÇA EXTRA:
          // Confere silenciosamente no banco se esse usuário ainda existe e está 'Ativo'.
          const { data, error } = await supabase
            .from('employees')
            .select('status')
            .eq('id', parsedUser.id)
            .single();

          if (error || !data || data.status !== 'Ativo') {
             // Se foi demitido ou bloqueado, força o logout
             signOut();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar sessão:", error);
        localStorage.removeItem('hawk_user');
      } finally {
        // Só libera o App para renderizar depois de checar o storage
        setLoading(false);
      }
    }

    loadUserFromStorage();
  }, []);

  async function signIn(email, password) {
    try {
      // Busca usuário
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .eq('status', 'Ativo')
        .single();

      if (error || !data) throw new Error("Acesso negado.");

      // SEGURANÇA: Remove a senha do objeto antes de salvar no navegador
      // A linha de disable foi removida pois causava o erro relatado
      const { password: _, ...safeUser } = data;

      setUser(safeUser);
      localStorage.setItem('hawk_user', JSON.stringify(safeUser));
      
      toast.success(`Bem-vindo, ${safeUser.name}!`);
      return safeUser;

    } catch (error) {
      console.error(error);
      toast.error("Email ou senha incorretos.");
      return null;
    }
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem('hawk_user');
    toast.success("Saiu do sistema.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}