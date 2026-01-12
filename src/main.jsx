import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { CashierProvider } from './contexts/CashierContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CashierProvider>
        <App />
      </CashierProvider>
    </AuthProvider>
  </React.StrictMode>,
)