import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Contextos (Essenciais para o sistema funcionar)
import { AuthProvider } from './contexts/AuthContext'
import { CashierProvider } from './contexts/CashierContext'

// Layouts e Páginas
import { AppLayout } from './layouts/AppLayout'
import { Login } from './pages/Login'
import { SuperAdmin } from './pages/SuperAdmin' // Página Secreta

import Pedidos from './pages/Pedidos'
import Dashboard from './pages/Dashboard'
import { Vendas } from './pages/Vendas'
import { Mesas } from './pages/Mesas'
import { Estoque } from './pages/Estoque'
import { Inventario } from './pages/Inventario'
import { Equipe } from './pages/Equipe'
import { EmployeeDetails } from './pages/EmployeeDetails'
import { Configuracoes } from './pages/Configuracoes'
import { Relatorios } from './pages/Relatorios'
import { Notificacoes } from './pages/Notificacoes'
import { Cozinha } from './pages/Cozinha'
import { Bar } from './pages/Bar'
import IfoodMenu from './pages/IfoodMenu';
import IfoodConfig from './pages/IfoodConfig';
import CardapioIfood from './pages/CardapioIfood';
import MasterDashboard from './pages/MasterDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      
      {/* Envolvendo a aplicação com os contextos de Autenticação e Caixa */}
      <AuthProvider>
        <CashierProvider>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<Login />} />
            
            {/* Rota Secreta (Criação de Clientes) */}
            <Route path="/master-admin" element={<SuperAdmin />} />

            {/* Rotas Protegidas (Layout Principal com Menu) */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="vendas" element={<Vendas />} />
              <Route path="mesas" element={<Mesas />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="equipe" element={<Equipe />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="notificacoes" element={<Notificacoes />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="masterdashboard" element={<MasterDashboard />} />
              
              {/* Rotas iFood */}
              <Route path="/config/ifood" element={<IfoodConfig />} />
              <Route path="/ifood-menu" element={<IfoodMenu />} />
              <Route path="/ifood-cardapio" element={<CardapioIfood />} /> {/* Nova Rota */}
              <Route path="/pedidos" element={<Pedidos />} />
              
              {/* KDS */}
              <Route path="cozinha" element={<Cozinha />} />
              <Route path="bar" element={<Bar />} />
              
              <Route path="/funcionarios/:id" element={<EmployeeDetails />} />
            </Route>

            {/* Redirecionamento para qualquer rota desconhecida */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CashierProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}