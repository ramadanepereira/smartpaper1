import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Topbar ──
 * Barra superior com menu hamburger, pesquisa global, modo escuro e perfil do utilizador.
 * Em mobile (< 768px), elementos menos essenciais são ocultados. */
export default function Topbar({ onToggleSidebar }) {
  const { utilizador, darkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const [pesquisa, setPesquisa] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  /* ── Detecta ecrã pequeno para adaptar a interface ── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Pesquisa global: redirecciona para a página de clientes com o termo ──
   * Enter dispara a navegação. Útil para encontrar clientes rapidamente. */
  const handleSearch = (e) => {
    if (e.key === 'Enter' && pesquisa.trim()) {
      const termo = pesquisa.trim().toLowerCase();
      navigate(`/clientes?search=${encodeURIComponent(termo)}`);
      setPesquisa('');
    }
  };

  return (
    <div style={{
      height: 56,
      background: darkMode ? '#1E293B' : '#fff',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#E2E8F0'}`,
      display: 'flex', alignItems: 'center', padding: '0 16px',
      gap: 8, flexShrink: 0
    }}>
      <div onClick={onToggleSidebar} style={{
        fontSize: 20, cursor: 'pointer',
        color: darkMode ? '#94A3B8' : '#64748B',
        display: 'flex', alignItems: 'center', padding: '4px'
      }}>☰</div>

      {!isMobile && (
        <div style={{
          flex: 1, maxWidth: 400,
          background: darkMode ? '#0F172A' : '#F1F5F9',
          border: `1px solid ${darkMode ? '#334155' : '#E2E8F0'}`,
          borderRadius: 8, padding: '7px 12px',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
        }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar clientes, pedidos, serviços..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            onKeyDown={handleSearch}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, width: '100%',
              color: darkMode ? '#F1F5F9' : '#1E293B',
            }}
          />
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: darkMode ? '#94A3B8' : '#64748B' }}>
          {!isMobile && <span>🌙 Modo escuro</span>}
          <div onClick={toggleDarkMode} style={{
            width: 36, height: 20, borderRadius: 10,
            background: darkMode ? '#3B82F6' : '#CBD5E1',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
          }}>
            <div style={{
              position: 'absolute', top: 2,
              left: darkMode ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s'
            }} />
          </div>
        </div>

        {!isMobile && (
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div style={{
              position: 'absolute', top: -4, right: -4,
              background: '#EF4444', color: '#fff', borderRadius: '50%',
              width: 16, height: 16, fontSize: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>3</div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13
          }}>
            {utilizador?.nome?.charAt(0) || 'A'}
          </div>
          {!isMobile && (
            <div>
              <div style={{ color: darkMode ? '#F1F5F9' : '#1E293B', fontWeight: 600, fontSize: 13, lineHeight: 1 }}>
                {utilizador?.nome || 'Administrador'}
              </div>
              <div style={{ color: '#64748B', fontSize: 11 }}>
                {utilizador?.perfil || 'Admin'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
