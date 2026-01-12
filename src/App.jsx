import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from './layouts/AppLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="vendas" element={<Vendas />} />
          <Route path="mesas" element={<Mesas />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="equipe/:id" element={<EmployeeDetails />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="cozinha" element={<Cozinha />} />
          <Route path="bar" element={<Bar />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}