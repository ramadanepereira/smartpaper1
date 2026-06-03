/* ── Pagamentos ──
 * Registo e listagem de pagamentos associados a pedidos.
 * KPIs: total faturado, por método (M-Pesa, e-Mola, Dinheiro).
 * Câmbio em tempo real via exchangerate-api.com (USD e ZAR).
 * Filtros: pesquisa textual e por método de pagamento. */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';

// ===== ESTILOS =====
const inputStyle = (erro) => ({
  width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${erro ? '#EF4444' : '#E2E8F0'}`,
  fontSize: 13, outline: 'none', background: '#fff', color: '#1E293B', transition: 'border-color 0.2s',
});
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 };
const selectStyle = { ...inputStyle(), padding: '9px 14px' };

// ===== CONSTANTES =====
const metodos = ['dinheiro', 'mpesa', 'emola'];
const metodoLabel = { dinheiro: 'Dinheiro', mpesa: 'M-Pesa', emola: 'e-Mola' };
const metodoCores = {
  dinheiro: { bg: '#D1FAE5', text: '#065F46' },
  mpesa: { bg: '#DBEAFE', text: '#1E40AF' },
  emola: { bg: '#FEF3C7', text: '#92400E' },
};

// ===== COMPONENTE: TOAST =====
function Toast({ mensagem, tipo, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 999,
      background: tipo === 'sucesso' ? '#10B981' : '#EF4444', color: '#fff',
      padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span>{tipo === 'sucesso' ? '✅' : '❌'}</span> {mensagem}
    </div>
  );
}

// ===== COMPONENTE: MODAL =====
function Modal({ titulo, children, onClose, maxWidth }) {
  const { darkMode } = useAuth();
  const bg = darkMode ? '#1E293B' : '#fff';
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: bg, borderRadius: 16, padding: 28, maxWidth: maxWidth || 560, width: '100%',
        maxHeight: '85vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: darkMode ? '#F1F5F9' : '#1E293B' }}>{titulo}</div>
          <span onClick={onClose} style={{ fontSize: 20, cursor: 'pointer', color: '#94A3B8', lineHeight: 1 }}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL: PAGAMENTOS =====
export default function Pagamentos() {
  const { darkMode, API } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  // ----- Estado -----
  const [pagamentos, setPagamentos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [search, setSearch] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [kpis, setKpis] = useState({ totalFaturado: 0, mpesa: 0, emola: 0, dinheiro: 0 });
  const [cambio, setCambio] = useState({ usd: 63.50, zar: 3.45 });
  const [form, setForm] = useState({ pedido_id: '', valor: '', metodo: 'dinheiro', referencia: '', notas: '' });
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  // ----- Tema -----
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';
  const cardBg = darkMode ? '#1E293B' : '#fff';
  const border = darkMode ? '#334155' : '#E2E8F0';

  /* ── Carrega pagamentos, KPIs financeiros e taxas de câmbio ──
   * Filtros: pesquisa textual e método de pagamento.
   * Câmbio obtido de exchangerate-api.com (fallback manual se falhar). */
  const carregar = useCallback(() => {
    let url = `${API}/pagamentos?`;
    if (search) url += `search=${search}&`;
    if (metodoFiltro) url += `metodo=${metodoFiltro}`;
    axios.get(url).then(r => setPagamentos(r.data)).catch(() => {});
    axios.get(`${API}/relatorios/financeiro?inicio=2000-01-01&fim=2100-01-01`).then(r => {
      const totais = { totalFaturado: r.data.totalFaturado, mpesa: 0, emola: 0, dinheiro: 0 };
      (r.data.porMetodo || []).forEach(m => { totais[m.metodo] = m.total; });
      setKpis(totais);
    }).catch(() => {});
    try {
      fetch('https://api.exchangerate-api.com/v4/latest/MZN').then(r => r.json()).then(d => {
        if (d.rates) setCambio({ usd: d.rates.USD ? 1 / d.rates.USD : 63.50, zar: d.rates.ZAR ? 1 / d.rates.ZAR : 3.45 });
      }).catch(() => {});
    } catch {}
  }, [search, metodoFiltro, API]);

  // ----- Efeito: carregar ao montar -----
  useEffect(() => { carregar(); }, [carregar]);

  // ----- Utilitário: notificação -----
  const showToast = (msg, tipo) => setToast({ mensagem: msg, tipo });

  // ----- Modal: abrir formulário de pagamento -----
  const abrirModal = async () => {
    try {
      const res = await axios.get(`${API}/pedidos?status=pendente,em_andamento`);
      setPedidos(res.data);
    } catch {}
    setForm({ pedido_id: '', valor: '', metodo: 'dinheiro', referencia: '', notas: '' });
    setPedidoSelecionado(null);
    setModal(true);
  };

  // ----- Modal: selecionar pedido -----
  const selecionarPedido = async (id) => {
    if (!id) { setPedidoSelecionado(null); setForm(f => ({ ...f, pedido_id: '', valor: '' })); return; }
    try {
      const res = await axios.get(`${API}/pedidos/${id}`);
      setPedidoSelecionado(res.data);
      setForm(f => ({ ...f, pedido_id: id, valor: String(res.data.total) }));
    } catch {}
  };

  /* ── Regista pagamento via API ──
   * M-Pesa e e-Mola exigem referência (número de transacção). */
  const handleSave = async () => {
    if (!form.pedido_id || !form.valor || !form.metodo) { showToast('Preencha todos os campos obrigatórios', 'erro'); return; }
    if ((form.metodo === 'mpesa' || form.metodo === 'emola') && !form.referencia.trim()) {
      showToast('Referência é obrigatória para este método', 'erro'); return;
    }
    try {
      await axios.post(`${API}/pagamentos`, form);
      showToast('Pagamento registado com sucesso', 'sucesso');
      setModal(false); carregar();
    } catch (err) { showToast(err.response?.data?.erro || 'Erro ao registar pagamento', 'erro'); }
  };

  // ===== COMPONENTE: KPI BOX =====
  const KPIBox = ({ label, value, cor }) => (
    <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: `1px solid ${border}`, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor || text }}>{value?.toLocaleString()} MT</div>
    </div>
  );

  // ===== RENDERIZAÇÃO =====
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: isMobile ? 12 : 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: text }}>Pagamentos</div>
        <button onClick={abrirModal} style={{
          width: isMobile ? '100%' : 'auto', padding: '10px 20px', background: '#2563EB', color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>+ Novo Pagamento</button>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KPIBox label="Total Faturado" value={kpis.totalFaturado} cor="#2563EB" />
        <KPIBox label="Via M-Pesa" value={kpis.mpesa} cor="#1E40AF" />
        <KPIBox label="Via e-Mola" value={kpis.emola} cor="#92400E" />
        <KPIBox label="Em Dinheiro" value={kpis.dinheiro} cor="#065F46" />
      </div>
      <div style={{
        background: cardBg, borderRadius: 12, border: `1px solid ${border}`,
        padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, fontSize: 12,
      }}>
        <span style={{ fontWeight: 600, color: text }}>💱 Câmbio em Tempo Real</span>
        <span style={{ color: muted }}>1 USD = <strong style={{ color: '#10B981' }}>{cambio.usd?.toFixed(2)} MT</strong></span>
        <span style={{ color: muted }}>1 ZAR = <strong style={{ color: '#F59E0B' }}>{cambio.zar?.toFixed(2)} MT</strong></span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input type="text" placeholder="Pesquisar..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle(), maxWidth: 300, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }} />
        <select value={metodoFiltro} onChange={e => setMetodoFiltro(e.target.value)}
          style={{ ...selectStyle, maxWidth: 180, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }}>
          <option value="">Todos métodos</option>
          {metodos.map(m => <option key={m} value={m}>{metodoLabel[m]}</option>)}
        </select>
      </div>
      <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
        <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${border}` }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Pedido</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: muted, fontWeight: 600 }}>Valor</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Método</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Referência</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Notas</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: text }}>{p.pedido_numero || `#${p.pedido_id}`}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: text }}>{p.valor?.toLocaleString()} MT</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: (metodoCores[p.metodo] || {}).bg,
                    color: (metodoCores[p.metodo] || {}).text,
                  }}>{metodoLabel[p.metodo] || p.metodo}</span>
                </td>
                <td style={{ padding: '12px 16px', color: muted, fontSize: 12 }}>{p.referencia || '-'}</td>
                <td style={{ padding: '12px 16px', color: muted, fontSize: 12 }}>{p.notas || '-'}</td>
                <td style={{ padding: '12px 16px', color: muted, fontSize: 12 }}>{new Date(p.criado_em).toLocaleDateString()}</td>
              </tr>
            ))}
            {pagamentos.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: muted }}>Nenhum pagamento encontrado</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      {modal && (
        <Modal titulo="Registar Pagamento" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Pedido *</label>
              <select value={form.pedido_id} onChange={e => selecionarPedido(e.target.value)}
                style={{ ...selectStyle, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }}>
                <option value="">Seleccionar pedido...</option>
                {pedidos.map(p => (
                  <option key={p.id} value={p.id}>{p.numero} - {p.nome_cliente || p.cliente_nome || '-'} ({p.total?.toLocaleString()} MT)</option>
                ))}
              </select>
            </div>
            {pedidoSelecionado && (
              <div style={{
                background: darkMode ? '#0F172A' : '#F8FAFC', borderRadius: 8, padding: 12, border: `1px solid ${border}`,
              }}>
                <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Total do Pedido: <strong style={{ color: text }}>{pedidoSelecionado.total?.toLocaleString()} MT</strong></div>
                <div style={{ fontSize: 12, color: muted }}>Cliente: <strong style={{ color: text }}>{pedidoSelecionado.nome_cliente || pedidoSelecionado.cliente_nome || '-'}</strong></div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Valor (MT) *</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  style={{ ...inputStyle(), flex: 1, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }} />
                {form.valor && cambio.usd && (
                  <span style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>
                    ≈ ${(parseFloat(form.valor || 0) / cambio.usd).toFixed(2)} USD | R{(parseFloat(form.valor || 0) / cambio.zar).toFixed(2)} ZAR
                  </span>
                )}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Método de Pagamento *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {metodos.map(m => (
                  <div key={m} onClick={() => setForm(f => ({ ...f, metodo: m }))} style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: form.metodo === m ? (metodoCores[m] || {}).bg : darkMode ? '#0F172A' : '#F1F5F9',
                    color: form.metodo === m ? (metodoCores[m] || {}).text : muted,
                    border: `1.5px solid ${form.metodo === m ? (metodoCores[m] || {}).text : border}`,
                    transition: 'all 0.2s',
                  }}>
                    {metodoLabel[m]}
                  </div>
                ))}
              </div>
            </div>
            {(form.metodo === 'mpesa' || form.metodo === 'emola') && (
              <div>
                <label style={labelStyle}>Referência *</label>
                <input type="text" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                  placeholder="Nº de transacção" style={{ ...inputStyle(true), background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Notas</label>
              <input type="text" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                style={{ ...inputStyle(), background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(false)} style={{
                padding: '10px 20px', borderRadius: 8, border: `1px solid ${border}`,
                background: 'transparent', color: text, cursor: 'pointer', fontSize: 13,
              }}>Cancelar</button>
              <button onClick={handleSave} style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#2563EB', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Registar Pagamento</button>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
