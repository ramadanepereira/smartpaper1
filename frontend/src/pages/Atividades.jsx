/* ── Atividades (Audit Log) ──
 * Registo cronológico de todas as acções no sistema (login, CRUD, etc.).
 * Apenas administradores têm acesso (RotaAdmin em App.jsx).
 * Filtros por entidade (cliente, pedido, etc.) e tipo (criação, edição, etc.).
 * Dados obtidos de GET /api/atividades com parâmetros opcionais. */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import axios from 'axios';

const tipoCores = {
  criacao: { bg: '#D1FAE5', color: '#065F46', label: 'Criação' },
  atualizacao: { bg: '#DBEAFE', color: '#1E40AF', label: 'Actualização' },
  eliminacao: { bg: '#FEE2E2', color: '#991B1B', label: 'Remoção' },
  mudanca_status: { bg: '#FEF3C7', color: '#92400E', label: 'Mudança Status' },
  login: { bg: '#EDE9FE', color: '#4C1D95', label: 'Login' },
};

const entidadeIcon = {
  cliente: '👥', servico: '🖨️', pedido: '📋', pagamento: '💳', utilizador: '👤',
};

export default function Atividades() {
  const { darkMode, API } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroEntidade, setFiltroEntidade] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const border = darkMode ? '#334155' : '#E2E8F0';
  const card = darkMode ? '#1E293B' : '#fff';
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';

  useEffect(() => {
    carregar();
  }, [filtroEntidade, filtroTipo]);

  async function carregar() {
    setCarregando(true);
    try {
      let url = `${API}/atividades?limite=200`;
      if (filtroEntidade) url += `&entidade=${filtroEntidade}`;
      if (filtroTipo) url += `&tipo=${filtroTipo}`;
      const res = await axios.get(url);
      setAtividades(res.data);
    } catch {} finally { setCarregando(false); }
  }

  function formatarData(dataStr) {
    if (!dataStr) return '-';
    const d = new Date(dataStr + (dataStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>📜 Histórico de Actividades</h1>
          <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>Registo cronológico de todas as acções realizadas no sistema.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filtroEntidade} onChange={e => setFiltroEntidade(e.target.value)}
          style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: text, outline: 'none', cursor: 'pointer' }}>
          <option value="">Todas as entidades</option>
          {['cliente', 'servico', 'pedido', 'pagamento', 'utilizador'].map(e => (
            <option key={e} value={e}>{entidadeIcon[e] || '📄'} {e.charAt(0).toUpperCase() + e.slice(1)}s</option>
          ))}
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: text, outline: 'none', cursor: 'pointer' }}>
          <option value="">Todos os tipos</option>
          {Object.entries(tipoCores).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: muted, whiteSpace: 'nowrap' }}>
          {atividades.length} registo{atividades.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: darkMode ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${border}` }}>
                {['Data/Hora', 'Utilizador', 'Acção', 'Descrição'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: muted }}>A carregar...</td></tr>
              ) : atividades.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
                    <div style={{ color: text, fontWeight: 600, marginBottom: 4 }}>Nenhuma actividade encontrada</div>
                    <div style={{ color: muted, fontSize: 13 }}>As acções realizadas no sistema aparecerão aqui.</div>
                  </td>
                </tr>
              ) : atividades.map((a, i) => {
                const tc = tipoCores[a.tipo] || { bg: '#F1F5F9', color: '#64748B', label: a.tipo };
                return (
                  <tr key={a.id || i} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? 'transparent' : darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                    <td style={{ padding: '12px 16px', color: muted, fontSize: 12, whiteSpace: 'nowrap' }}>{formatarData(a.criado_em)}</td>
                    <td style={{ padding: '12px 16px', color: text }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {(a.utilizado_nome || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span>{a.utilizado_nome || 'Sistema'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{entidadeIcon[a.entidade] || '📄'}</span>
                        <span style={{ background: tc.bg, color: tc.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{tc.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: text, fontSize: 13 }}>{a.descricao}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: muted }}>
        Últimas {atividades.length} actividade{atividades.length !== 1 ? 's' : ''} registada{atividades.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
