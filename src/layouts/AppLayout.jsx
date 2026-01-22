import { useState, useEffect } from 'react'
import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Beer, 
  ShoppingCart, 
  Settings, 
  ChefHat, 
  LogOut, 
  ClipboardCheck, 
  Bell, 
  KanbanSquare, 
  Crown, 
  LayoutGrid, 
  UtensilsCrossed,
  BarChart3 // Novo ícone para Relatórios
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Componentes iFood
import { IfoodSimulator } from '../components/IfoodSimulator'
import { IfoodPolling } from '../components/IfoodPolling'

export function AppLayout() {
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0)

  // Permissões: Gerente e Master veem o menu completo
  const isManager = user?.role === 'Gerente' || user?.role === 'Master';
  const isMaster = user?.role === 'Master';

  // Verifica notificações/pendências (Polling)
  useEffect(() => {
    if (isManager) {
      const checkPending = async () => {
        const { count } = await supabase
          .from('pending_actions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        setPendingCount(count || 0)
      }
      checkPending()
      const interval = setInterval(checkPending, 10000) 
      return () => clearInterval(interval)
    }
  }, [isManager])

  if (!user) return <Navigate to="/login" />

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col print:hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Hawk Vision</h1>
            <p className="text-xs text-slate-500">Sistema de Gestão</p>
          </div>
          {/* Badge do Usuário */}
          <div className="flex flex-col items-end">
             <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border ${isMaster ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-slate-600'}`}>
                {user.role || '...'}
             </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* MENU PRINCIPAL */}
            {isManager && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-2">Gestão</p>
                  <NavItem to="/" icon={<LayoutDashboard size={20}/>} label="Dashboard" />
                  
                  {/* NOVO ITEM: RELATÓRIOS */}
                  <NavItem to="/relatorios" icon={<BarChart3 size={20}/>} label="Relatórios & Logs" />

                  <NavItem to="/vendas" icon={<ShoppingCart size={20}/>} label="Vendas / PDV" />
                  <NavItem to="/pedidos" icon={<ClipboardCheck size={20}/>} label="Pedidos" />
                  
                  <NavItem to="/mesas" icon={<LayoutGrid size={20}/>} label="Gestão de Mesas" />
                  <NavItem to="/cozinha" icon={<ChefHat size={20}/>} label="KDS Cozinha" />
                  <NavItem to="/bar" icon={<Beer size={20}/>} label="KDS Bar" />
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-2">Cadastros</p>
                  
                  <NavItem to="/inventario" icon={<Package size={20}/>} label="Inventário" />
                  <NavItem to="/estoque" icon={<UtensilsCrossed size={20}/>} label="Estoque (Insumos)" />
                  <NavItem to="/equipe" icon={<Users size={20}/>} label="Equipe" />
                  
                  <NavItem to="/notificacoes" icon={<Bell size={20}/>} label={`Notificações ${pendingCount > 0 ? `(${pendingCount})` : ''}`} highlight={pendingCount > 0} />
                </div>

                {/* ITEM EXCLUSIVO MASTER */}
                {isMaster && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider mb-2 pl-2">Admin</p>
                      <NavItem to="/master-admin" icon={<Crown size={20} className="text-amber-400"/>} label="Painel Master" />
                    </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-800">
                   <NavItem to="/configuracoes" icon={<Settings size={20}/>} label="Configurações" />
                   <NavItem to="/config/ifood" icon={<KanbanSquare size={20}/>} label="Ifood Config" />
                </div>
              </>
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

        <IfoodSimulator />
        <IfoodPolling />
        
      </main>
    </div>
  )
}

function NavItem({ to, icon, label, highlight }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center px-3 py-2.5 mb-1 text-sm font-medium rounded-lg transition-colors ${
          isActive 
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
            : highlight 
              ? 'text-amber-400 hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        }`
      }
    >
      <span className="mr-3">{icon}</span>
      {label}
    </NavLink>
  )
}