/**
 * Avukat Yönetim Sistemi - Ana App Component
 * Router, Context ve tema yapılandırması
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeContextProvider } from './contexts/ThemeContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Cases from './pages/Cases';
import Finance from './pages/Finance';
import Leads from './pages/Leads';
import Documents from './pages/Documents';
import Calendar from './pages/Calendar';
import Templates from './pages/Templates';
import Users from './pages/Users';
import Settings from './pages/Settings';

// Components
import Layout from './components/common/Layout';

/**
 * Korumalı route bileşeni
 * Giriş yapmamış kullanıcıları login sayfasına yönlendirir
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Yükleniyor...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Giriş route'u
 * Zaten giriş yapmış kullanıcıları dashboard'a yönlendirir
 */
const LoginRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Yükleniyor...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Admin route'u
 * Admin olmayan kullanıcıları dashboard'a yönlendirir
 */
const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Ana uygulama bileşeni
 */
function App() {
  return (
    <ThemeContextProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Login sayfası */}
              <Route 
                path="/login" 
                element={
                  <LoginRoute>
                    <Login />
                  </LoginRoute>
                } 
              />

              {/* Korumalı sayfalar */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="cases" element={<Cases />} />
                <Route path="finance" element={<Finance />} />
                <Route path="leads" element={<Leads />} />
                <Route path="documents" element={<Documents />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="templates" element={<Templates />} />
                <Route 
                  path="users" 
                  element={
                    <AdminRoute>
                      <Users />
                    </AdminRoute>
                  } 
                />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Bilinmeyen rotaları ana sayfaya yönlendir */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeContextProvider>
  );
}

export default App;
