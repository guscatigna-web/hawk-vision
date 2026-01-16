import { useState, useEffect } from 'react'
import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, Package, Users, Beer, ShoppingCart, Settings, ChefHat, LogOut, ClipboardCheck, FileBarChart, Bell, UtensilsCrossed, KanbanSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// --- NOVO: Import do Simulador ---
import { IfoodSimulator } from '../components/IfoodSimulator'

export function AppLayout() {
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0)

  // Verifica pendências periodicamente (Polling simples)
  useEffect(() => {
    if (user?.role === 'Gerente') {
      const checkPending = async () => {
        const { count } = await supabase
          .from('pending_actions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        setPendingCount(count || 0)
      }
      checkPending()
      const interval = setInterval(checkPending, 10000) // Checa a cada 10s
      return () => clearInterval(interval)
    }
  }, [user])

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isManager = user.role === 'Gerente';
  const isKitchen = user.role === 'Cozinha';
  const isService = user.role === 'Caixa' || user.role === 'Garçom';

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 print:hidden">
        
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <ChefHat className="w-8 h-8 text-blue-500 mr-2" />
          <div>
            <span className="text-lg font-bold text-white block leading-none">Hawk Vision</span>
            <span className="text-xs text-slate-500 font-medium">{user.role}</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
          
          {/* --- NOTIFICAÇÕES (SÓ GERENTE) --- */}
          {isManager && (
            <NavLink 
              to="/notificacoes" 
              className={({ isActive }) => 
                `flex items-center justify-between px-4 py-3 rounded-lg transition-all mb-4 ${
                  isActive ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`
              }
            >
              <div className="flex items-center">
                <Bell size={20} />
                <span className="ml-3 font-medium">Notificações</span>
              </div>
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          )}

          {isManager && (
            <>
              <NavItem to="/" icon={<LayoutDashboard size={20}/>} label="Dashboard" />
              <NavItem to="/relatorios" icon={<FileBarChart size={20}/>} label="Relatórios" />
            </>
          )}
          
          {/* --- ÁREA DE VENDAS --- */}
          {(isManager || isService) && (
            <>
              <NavItem to="/vendas" icon={<ShoppingCart size={20}/>} label="Caixa Rápido" />
              <NavItem to="/mesas" icon={<UtensilsCrossed size={20}/>} label="Restaurante" />
            </>
          )}
          
          {/* --- ÁREA OPERACIONAL --- */}
          {(isManager || isKitchen) && (
             <>
                <NavItem to="/cozinha" icon={<ChefHat size={20}/>} label="KDS Cozinha" />
                <NavItem to="/bar" icon={<Beer size={20}/>} label="KDS Bar" />
               <NavItem to="/estoque" icon={<Package size={20}/>} label="Estoque" />
               <NavItem to="/inventario" icon={<ClipboardCheck size={20}/>} label="Inventário" />
             </>
          )}

          {/* --- EQUIPE --- */}
          {isManager && (
            <>
              <NavItem to="/equipe" icon={<Users size={20}/>} label="Equipe" />
            </>
          )}

          {/* --- CONFIGURAÇÕES --- */}
          {isManager && (
            <div className="pt-4 mt-4 border-t border-slate-800">
               <NavItem to="/configuracoes" icon={<Settings size={20}/>} label="Configurações" />
               <NavItem to="/ifood" icon={<KanbanSquare size={20}/>} label="Ifood" />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={signOut} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={18} className="mr-2" /> Sair da Conta
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50 print:bg-white relative">
        <div className="p-8 print:p-0">
          <Outlet />
        </div>

        {/* --- SIMULADOR DE IFOOD (FLUTUANTE) --- */}
        <IfoodSimulator />
        
      </main>
    </div>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center px-4 py-3 rounded-lg transition-all ${
          isActive 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
            : "hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      {icon}
      <span className="ml-3 font-medium">{label}</span>
    </NavLink>
  )
}