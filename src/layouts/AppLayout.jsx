import { useState, useEffect } from 'react'
import { Outlet, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
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
  BarChart3,
  Undo2,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Componente iFood Polling (Mantido)
import { IfoodPolling } from '../components/IfoodPolling'
// IfoodSimulator removido conforme solicitado

export function AppLayout() {
  const { user, signOut, isImpersonating, exitImpersonation } = useAuth();
  const [pendingCount, setPendingCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Controle do Menu Mobile
  const navigate = useNavigate()
  const location = useLocation()

  // Permissões
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

  // --- CORREÇÃO DO ERRO DO SIDEBAR ---
  // Só fecha o sidebar se ele estiver realmente aberto
  useEffect(() => {
    if (sidebarOpen) {
      setSidebarOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]) 
  // Nota: Não colocamos 'sidebarOpen' nas deps para evitar que ele feche imediatamente ao abrir

  if (!user) return <Navigate to="/login" />

  // Itens da Barra Inferior (Mobile)
  const mobileNavItems = [
    { label: 'Mesas', path: '/mesas', icon: UtensilsCrossed },
    { label: 'Venda', path: '/vendas', icon: ShoppingCart },
    { label: 'Pedidos', path: '/pedidos', icon: ClipboardCheck },
    { label: 'Menu', action: () => setSidebarOpen(true), icon: Menu }, // Abre a Sidebar
  ]

  const isActivePath = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* --- SIDEBAR (Responsiva: Drawer no Mobile / Fixa no Desktop) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col print:hidden 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header da Sidebar */}
        <div className={`p-4 border-b ${isImpersonating ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-800'} flex items-center justify-between transition-colors`}>
          <div>
            <h1 className={`font-bold text-lg ${isImpersonating ? 'text-amber-400' : 'text-white'}`}>
              {isImpersonating ? 'MODO ESPIÃO' : 'Hawk Vision'}
            </h1>
            <p className="text-xs text-slate-500">
              {isImpersonating ? 'Acesso Remoto' : 'Sistema de Gestão'}
            </p>
          </div>
          
          {/* Badge do Usuário e Botão Fechar (Mobile) */}
          <div className="flex flex-col items-end gap-1">
             <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border ${isMaster || isImpersonating ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-slate-600'}`}>
                {user.role || '...'}
             </span>
             {/* Botão X só aparece no mobile */}
             <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white mt-1">
                <X size={20} />
             </button>
          </div>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            
            {/* BLOCO MODO ESPIÃO */}
            {isImpersonating && (
                <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/50 rounded-xl mx-1 animate-fade-in">
                    <p className="text-[10px] text-amber-400 font-bold mb-2 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                        <Crown size={12} /> Você é Master
                    </p>
                    <p className="text-xs text-slate-400 text-center mb-3">
                        Vendo loja: <br/> <strong className="text-white">{user.company_name}</strong>
                    </p>
                    <button 
                        onClick={exitImpersonation}
                        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                    >
                        <Undo2 size={16} /> Sair da Loja
                    </button>
                </div>
            )}

            {isManager && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-2">Gestão</p>
                  <NavItem to="/" icon={<LayoutDashboard size={20}/>} label="Dashboard" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/relatorios" icon={<BarChart3 size={20}/>} label="Relatórios & Logs" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/vendas" icon={<ShoppingCart size={20}/>} label="Vendas / PDV" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/pedidos" icon={<ClipboardCheck size={20}/>} label="Pedidos" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/mesas" icon={<LayoutGrid size={20}/>} label="Gestão de Mesas" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/cozinha" icon={<ChefHat size={20}/>} label="KDS Cozinha" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/bar" icon={<Beer size={20}/>} label="KDS Bar" onClick={() => setSidebarOpen(false)} />
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-2">Cadastros</p>
                  <NavItem to="/inventario" icon={<Package size={20}/>} label="Inventário" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/estoque" icon={<UtensilsCrossed size={20}/>} label="Estoque (Insumos)" onClick={() => setSidebarOpen(false)} />
                  <NavItem to="/equipe" icon={<Users size={20}/>} label="Equipe" onClick={() => setSidebarOpen(false)} />
                  <NavItem 
                    to="/notificacoes" 
                    icon={<Bell size={20}/>} 
                    label={`Notificações ${pendingCount > 0 ? `(${pendingCount})` : ''}`} 
                    highlight={pendingCount > 0} 
                    onClick={() => setSidebarOpen(false)}
                  />
                </div>

                {/* BLOCO EXCLUSIVO MASTER (PRESERVADO) */}
                {isMaster && (
                    <div className="mb-4 animate-fade-in">
                      <p className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider mb-2 pl-2">Admin Global</p>
                      <NavItem to="/master-dashboard" icon={<Crown size={20} className="text-amber-400"/>} label="Painel Master" onClick={() => setSidebarOpen(false)} />
                    </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-800">
                   <NavItem to="/configuracoes" icon={<Settings size={20}/>} label="Configurações" onClick={() => setSidebarOpen(false)} />
                   <NavItem to="/config/ifood" icon={<KanbanSquare size={20}/>} label="Ifood Config" onClick={() => setSidebarOpen(false)} />
                </div>
              </>
            )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={signOut} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={18} className="mr-2" /> {isImpersonating ? 'Sair (Logout)' : 'Sair da Conta'}
          </button>
        </div>
      </aside>

      {/* Overlay para fechar sidebar no mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
        
        {/* Header Mobile (Logo + Avatar) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-20 shadow-sm">
           <div className="flex items-center gap-2">
              <LayoutGrid className="text-amber-500 w-6 h-6" />
              <span className="font-bold text-slate-800 text-lg tracking-tight">Hawk Vision</span>
           </div>
           <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm border border-amber-200">
             {user?.email?.[0]?.toUpperCase()}
           </div>
        </header>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 print:p-0 custom-scrollbar">
          <Outlet />
        </div>

        {/* --- BARRA DE NAVEGAÇÃO INFERIOR (Mobile Only) --- */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
          {mobileNavItems.map((item, index) => {
             const active = item.path && isActivePath(item.path);
             return (
              <button
                key={index}
                onClick={() => item.action ? item.action() : navigate(item.path)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px] ${
                  active ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Polling (IfoodSimulator Removido) */}
        <IfoodPolling />
        
      </main>
    </div>
  )
}

// NavItem atualizado para aceitar onClick (para fechar menu no mobile)
function NavItem({ to, icon, label, highlight, onClick }) {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
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