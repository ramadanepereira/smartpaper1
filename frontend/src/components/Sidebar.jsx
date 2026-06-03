import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

/* ── Sidebar de navegação principal ── */
export default function Sidebar({ aberto, onClose }) {
  const { utilizador, logout, darkMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /* ── Itens de navegação principais (visíveis para todos) ── */
  const navItems = [
    { label: 'Dashboard', icon: '🏠', path: '/' },
    { label: 'Clientes', icon: '👥', path: '/clientes' },
    { label: 'Serviços', icon: '🖨️', path: '/servicos' },
    { label: 'Pedidos', icon: '📋', path: '/pedidos' },
    { label: 'Pagamentos', icon: '💳', path: '/pagamentos' },
  ];
  /* ── Itens exclusivos para administradores ──
   * Relatórios, Atividades (auditoria) e Gestão de Utilizadores são páginas sensíveis. */
  if (utilizador?.perfil === 'admin') {
    navItems.push({ label: 'Relatórios', icon: '📊', path: '/relatorios' });
    navItems.push({ label: 'Atividades', icon: '📜', path: '/atividades' });
    navItems.push({ label: 'Utilizadores', icon: '👤', path: '/utilizadores' });
  }

  const extras = [
    { label: 'Ajuda', icon: '❓', path: '/ajuda' },
    { label: 'Sobre', icon: 'ℹ️', path: '/sobre' },
  ];

  const handleExtraClick = (path) => {
    if (path) { navigate(path); if (onClose) onClose(); }
  };

  /* ── Cores conforme o tema ── */
  const bg = darkMode ? '#0F172A' : '#1E3A5F';
  const textColor = '#F1F5F9';
  const mutedColor = '#94A3B8';
  const activeBg = 'rgba(255,255,255,0.12)';

  return (
    <div style={{
      width: aberto ? 220 : 0,
      height: '100vh', background: bg, color: textColor,
      display: 'flex', flexDirection: 'column', transition: 'width 0.3s',
      overflow: 'hidden', position: 'fixed', left: 0, top: 0, zIndex: 100,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Cabeçalho com logo ── */}
      <div style={{ padding: '16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '6px 10px', display: 'inline-block', margin: '0 auto 4px' }}>
          <img
            src={logo}
            alt="SmartPaper"
            style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div style={{ fontSize: 10, color: mutedColor, marginTop: 2, lineHeight: 1.3 }}>
          Gestão inteligente de impressão e papelaria
        </div>
      </div>

      {/* ── Itens de navegação ── */}
      <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {navItems.map(item => (
          <div key={item.path} onClick={() => { navigate(item.path); if (onClose) onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
              cursor: 'pointer', fontSize: 14, fontWeight: location.pathname === item.path ? 600 : 400,
              background: location.pathname === item.path ? activeBg : 'transparent',
              borderRight: location.pathname === item.path ? '3px solid #3B82F6' : '3px solid transparent',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = activeBg; }}
            onMouseLeave={e => { if (location.pathname !== item.path) e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 20px' }} />
        {extras.map(item => (
          <div key={item.label} onClick={() => handleExtraClick(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
              cursor: item.path ? 'pointer' : 'default', fontSize: 14, color: mutedColor,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = activeBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── Rodapé com info do utilizador ── */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{utilizador?.nome}</div>
        <div style={{ fontSize: 11, color: mutedColor, textTransform: 'capitalize' }}>{utilizador?.perfil}</div>
        <div onClick={logout} style={{
          marginTop: 10, fontSize: 13, color: '#F87171', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>🚪</span> Sair da conta
        </div>
      </div>
    </div>
  );
}
