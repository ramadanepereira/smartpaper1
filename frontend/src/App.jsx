import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Servicos from './pages/Servicos';
import Pedidos from './pages/Pedidos';
import Pagamentos from './pages/Pagamentos';
import Relatorios from './pages/Relatorios';
import Atividades from './pages/Atividades';
import Utilizadores from './pages/Utilizadores';
import Ajuda from './pages/Ajuda';
import Sobre from './pages/Sobre';

/* ── Guard de Rotas Autenticadas ──
 * Redirecciona para /login se o utilizador não estiver autenticado.
 * Exibe "A carregar..." enquanto verifica o token no montagem inicial. */
function RotaProtegida({ children }) {
  const { utilizador, carregando } = useAuth();
  if (carregando) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Inter', sans-serif" }}>A carregar...</div>;
  if (!utilizador) return <Navigate to="/login" replace />;
  return children;
}

/* ── Guard de Rotas de Administrador ──
 * Apenas utilizadores com perfil "admin" podem aceder.
 * Redirecciona para o Dashboard se não for admin. */
function RotaAdmin({ children }) {
  const { utilizador, carregando } = useAuth();
  if (carregando) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Inter', sans-serif" }}>A carregar...</div>;
  if (!utilizador) return <Navigate to="/login" replace />;
  if (utilizador.perfil !== 'admin') return <Navigate to="/" replace />;
  return children;
}

/* ── Layout Principal (Sidebar + Topbar + Conteúdo) ──
 * Em desktop, a sidebar é fixa e empurra o conteúdo (marginLeft dinâmico).
 * Em mobile (< 768px), a sidebar sobrepõe-se com overlay escuro e fecha automaticamente ao navegar. */
function Layout({ children }) {
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { darkMode } = useAuth();
  const location = useLocation();
  const bg = darkMode ? '#0F172A' : '#F1F5F9';

  /* ── Detecta mudanças de tamanho do ecrã e ajusta sidebar ── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    setSidebarAberta(!mq.matches);
    const handler = (e) => { setIsMobile(e.matches); setSidebarAberta(!e.matches); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Fecha sidebar ao navegar em mobile (melhora UX em ecrãs pequenos) ── */
  useEffect(() => {
    if (isMobile) setSidebarAberta(false);
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bg, fontFamily: "'Inter', sans-serif" }}>
      <Sidebar aberto={sidebarAberta} onClose={() => setSidebarAberta(false)} />
      {isMobile && sidebarAberta && (
        <div onClick={() => setSidebarAberta(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99,
        }} />
      )}
      <div style={{
        marginLeft: isMobile ? 0 : (sidebarAberta ? 220 : 0), flex: 1, transition: 'margin-left 0.3s',
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        <Topbar onToggleSidebar={() => setSidebarAberta(prev => !prev)} />
        <main style={{ flex: 1, padding: isMobile ? 12 : 24 }} className="fade-in">{children}</main>
      </div>
    </div>
  );
}

/* ── Componente de roteamento ── */
function AppContent() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
        <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
        <Route path="/servicos" element={<RotaProtegida><Servicos /></RotaProtegida>} />
        <Route path="/pedidos" element={<RotaProtegida><Pedidos /></RotaProtegida>} />
        <Route path="/pagamentos" element={<RotaProtegida><Pagamentos /></RotaProtegida>} />
        <Route path="/relatorios" element={<RotaAdmin><Relatorios /></RotaAdmin>} />
        <Route path="/atividades" element={<RotaAdmin><Atividades /></RotaAdmin>} />
        <Route path="/utilizadores" element={<RotaAdmin><Utilizadores /></RotaAdmin>} />
        <Route path="/ajuda" element={<RotaProtegida><Ajuda /></RotaProtegida>} />
        <Route path="/sobre" element={<RotaProtegida><Sobre /></RotaProtegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
