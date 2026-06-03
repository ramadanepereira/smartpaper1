import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import axios from 'axios';
import { gerarReciboPDF } from '../utils/gerarRecibo';

/* ── Pedidos ──
 * Gestão completa de pedidos: criar com itens, actualizar status,
 * editar observações, gerar recibo PDF, eliminar.
 * O pedido pode ter cliente cadastrado ou nome avulso.
 * Status: pendente → em_andamento → concluido → entregue / cancelado. */

const statusCores = {
  pendente: { bg: '#FEF3C7', color: '#92400E', label: 'Pendente' },
  em_andamento: { bg: '#DBEAFE', color: '#1E40AF', label: 'Em Andamento' },
  concluido: { bg: '#D1FAE5', color: '#065F46', label: 'Concluído' },
  entregue: { bg: '#EDE9FE', color: '#4C1D95', label: 'Entregue' },
  cancelado: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado' },
};

/* ── Toast ── Notificação temporária (3.5s) para feedback visual. */
function Toast({ mensagem, tipo, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const c = tipo === 'erro'
    ? { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', icon: '❌' }
    : { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', icon: '✅' };
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 18px', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 280 }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{mensagem}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>✕</span>
    </div>
  );
}

export default function Pedidos() {
  const { darkMode, API } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [form, setForm] = useState({
    cliente_id: '', nome_cliente: '', observacoes: '', prazo: ''
  });
  const [itensPedido, setItensPedido] = useState([]);
  const [erros, setErros] = useState({});

  const border = darkMode ? '#334155' : '#E2E8F0';
  const card = darkMode ? '#1E293B' : '#fff';
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';
  const inputBg = darkMode ? '#0F172A' : '#fff';

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
      const [p, c, s] = await Promise.all([
        axios.get(`${API}/pedidos`),
        axios.get(`${API}/clientes`),
        axios.get(`${API}/servicos`),
      ]);
      setPedidos(p.data);
      setClientes(c.data);
      setServicos(s.data);
    } catch { } finally { setCarregando(false); }
  }

  /* ── Filtro combinado: número do pedido, nome do cliente e/ou status ── */
  const pedidosFiltrados = pedidos.filter(p => {
    const matchPesquisa = p.numero?.toLowerCase().includes(pesquisa.toLowerCase()) ||
      (p.nome_cliente || p.cliente_nome || '').toLowerCase().includes(pesquisa.toLowerCase());
    const matchStatus = filtroStatus ? p.status === filtroStatus : true;
    return matchPesquisa && matchStatus;
  });

  /* ── Cálculo do total dos itens no modal de criação ── */
  const total = itensPedido.reduce((s, i) => s + i.quantidade * i.preco_unit, 0);

  function mostrarToast(m, t = 'sucesso') { setToast({ mensagem: m, tipo: t }); }

  function abrirModal() {
    setForm({ cliente_id: '', nome_cliente: '', observacoes: '', prazo: '' });
    setItensPedido([]);
    setErros({});
    setModal(true);
  }

  /* ── Adiciona/ incrementa item no pedido ──
   * Se o serviço já existe na lista, aumenta a quantidade em 1. */
  function adicionarItem(servico) {
    const existe = itensPedido.find(i => i.servico_id === servico.id);
    if (existe) {
      setItensPedido(itensPedido.map(i =>
        i.servico_id === servico.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setItensPedido([...itensPedido, {
        servico_id: servico.id,
        nome: servico.nome,
        preco_unit: servico.preco,
        quantidade: 1,
      }]);
    }
  }

  function removerItem(servico_id) {
    setItensPedido(itensPedido.filter(i => i.servico_id !== servico_id));
  }

  function alterarQuantidade(servico_id, qtd) {
    if (qtd < 1) return;
    setItensPedido(itensPedido.map(i =>
      i.servico_id === servico_id ? { ...i, quantidade: qtd } : i
    ));
  }

  /* ── Validação: exige cliente (cadastrado ou avulso) + pelo menos 1 item ── */
  function validar() {
    const e = {};
    if (!form.cliente_id && !form.nome_cliente.trim())
      e.cliente = 'Selecciona um cliente ou indica o nome';
    if (itensPedido.length === 0)
      e.itens = 'Adiciona pelo menos um serviço';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  /* ── Cria pedido via API com itens e dados do cliente ── */
  async function salvar() {
    if (!validar()) return;
    setSalvando(true);
    try {
      await axios.post(`${API}/pedidos`, {
        cliente_id: form.cliente_id || null,
        nome_cliente: form.nome_cliente || null,
        itens: itensPedido,
        observacoes: form.observacoes || null,
        prazo: form.prazo || null,
      });
      mostrarToast('Pedido criado com sucesso!');
      await carregarDados();
      setModal(false);
    } catch (err) {
      mostrarToast(err.response?.data?.erro || 'Erro ao criar pedido', 'erro');
    } finally { setSalvando(false); }
  }

  async function actualizarStatus(id, status) {
    try {
      await axios.put(`${API}/pedidos/${id}/status`, { status });
      mostrarToast('Estado actualizado!');
      await carregarDados();
      if (detalhe?.id === id) setDetalhe({ ...detalhe, status });
    } catch {
      mostrarToast('Erro ao actualizar estado', 'erro');
    }
  }

  const inputStyle = (campo) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${erros[campo] ? '#EF4444' : border}`,
    fontSize: 13, outline: 'none', background: inputBg,
    color: text, boxSizing: 'border-box',
  });

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: text, marginBottom: 5, textAlign: 'left',
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}>
          <div style={{ background: card, borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>➕ Novo Pedido</h3>
              <span onClick={() => setModal(false)} style={{ cursor: 'pointer', color: muted, fontSize: 20 }}>✕</span>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Cliente <span style={{ color: '#EF4444' }}>*</span></label>
                <select
                  style={inputStyle('cliente')}
                  value={form.cliente_id}
                  onChange={e => {
                    const c = clientes.find(c => c.id === Number(e.target.value));
                    setForm({ ...form, cliente_id: e.target.value, nome_cliente: c ? c.nome : '' });
                  }}
                >
                  <option value="">— Seleccionar cliente cadastrado —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <div style={{ textAlign: 'center', color: muted, fontSize: 12, margin: '8px 0' }}>ou</div>
                <input
                  style={inputStyle('cliente')}
                  placeholder="Nome do cliente avulso (não cadastrado)"
                  value={form.nome_cliente}
                  onChange={e => setForm({ ...form, nome_cliente: e.target.value, cliente_id: '' })}
                />
                {erros.cliente && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.cliente}</div>}
              </div>

              <div>
                <label style={labelStyle}>Adicionar serviços</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                  {servicos.filter(s => s.ativo !== 0).map(s => (
                    <div key={s.id} onClick={() => adicionarItem(s)} style={{
                      background: itensPedido.find(i => i.servico_id === s.id) ? '#DBEAFE' : (darkMode ? '#0F172A' : '#F8FAFC'),
                      border: `1px solid ${itensPedido.find(i => i.servico_id === s.id) ? '#3B82F6' : border}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <div style={{ color: text, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{s.nome}</div>
                      <div style={{ color: '#3B82F6', fontSize: 12, fontWeight: 700 }}>
                        {Number(s.preco).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </div>
                    </div>
                  ))}
                </div>
                {erros.itens && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.itens}</div>}
              </div>

              {itensPedido.length > 0 && (
                <div style={{ background: darkMode ? '#0F172A' : '#F8FAFC', borderRadius: 10, padding: 16, border: `1px solid ${border}` }}>
                  <div style={{ fontWeight: 600, color: text, fontSize: 13, marginBottom: 12 }}>Itens do pedido</div>
                  {itensPedido.map(item => (
                    <div key={item.servico_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, color: text, fontSize: 13 }}>{item.nome}</div>
                      <div style={{ color: muted, fontSize: 12 }}>
                        {Number(item.preco_unit).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => alterarQuantidade(item.servico_id, item.quantidade - 1)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${border}`, background: card, cursor: 'pointer', color: text, fontSize: 14 }}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center', color: text, fontSize: 13, fontWeight: 600 }}>{item.quantidade}</span>
                        <button onClick={() => alterarQuantidade(item.servico_id, item.quantidade + 1)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${border}`, background: card, cursor: 'pointer', color: text, fontSize: 14 }}>+</button>
                      </div>
                      <div style={{ color: text, fontWeight: 700, fontSize: 13, minWidth: 80, textAlign: 'right' }}>
                        {(item.quantidade * item.preco_unit).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </div>
                      <button onClick={() => removerItem(item.servico_id)}
                        style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <span style={{ color: muted, fontSize: 13 }}>Total:</span>
                    <span style={{ color: text, fontWeight: 700, fontSize: 16 }}>
                      {total.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Prazo de entrega</label>
                  <input type="datetime-local" style={inputStyle('prazo')} value={form.prazo}
                    onChange={e => setForm({ ...form, prazo: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Observações</label>
                  <input style={inputStyle('observacoes')} placeholder="Notas adicionais..."
                    value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', gap: 10 }}>
              <button onClick={salvar} disabled={salvando} style={{
                flex: 1, padding: '11px', background: '#2563EB', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                fontWeight: 600, opacity: salvando ? 0.7 : 1,
              }}>
                {salvando ? 'A criar...' : `Criar pedido — ${total.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`}
              </button>
              <button onClick={() => setModal(false)} style={{
                padding: '11px 20px', background: 'transparent', border: `1px solid ${border}`,
                borderRadius: 8, cursor: 'pointer', fontSize: 13, color: muted,
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: card, borderRadius: 12, padding: 28, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: text, fontSize: 16, textAlign: 'center', margin: '0 0 8px' }}>Eliminar pedido?</h3>
            <p style={{ color: muted, fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>
              Tens a certeza que queres eliminar o pedido <strong style={{ color: text }}>{confirmDelete.numero}</strong>?<br />
              Esta acção não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  try {
                    await axios.delete(`${API}/pedidos/${confirmDelete.id}`);
                    mostrarToast('Pedido eliminado com sucesso!');
                    setConfirmDelete(null);
                    setDetalhe(null);
                    await carregarDados();
                  } catch {
                    mostrarToast('Erro ao eliminar pedido', 'erro');
                  }
                }}
                style={{ flex: 1, padding: '10px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Sim, eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}>
          <div style={{ background: card, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>📋 {detalhe.numero}</h3>
              <span onClick={() => setDetalhe(null)} style={{ cursor: 'pointer', color: muted, fontSize: 20 }}>✕</span>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 2 }}>Cliente</div>
                  <div style={{ color: text, fontWeight: 600 }}>{detalhe.nome_cliente || detalhe.cliente_nome || '—'}</div>
                </div>
                <div>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 2 }}>Data</div>
                  <div style={{ color: text }}>{new Date(detalhe.criado_em).toLocaleDateString('pt-MZ')}</div>
                </div>
                <div>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 2 }}>Total</div>
                  <div style={{ color: text, fontWeight: 700, fontSize: 16 }}>{Number(detalhe.total).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</div>
                </div>
                <div>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 2 }}>Estado actual</div>
                  <span style={{ background: statusCores[detalhe.status]?.bg, color: statusCores[detalhe.status]?.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {statusCores[detalhe.status]?.label}
                  </span>
                </div>
              </div>

              {detalhe.observacoes && (
                <div style={{ background: darkMode ? '#0F172A' : '#F8FAFC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 4 }}>Observações</div>
                  <div style={{ color: text, fontSize: 13 }}>{detalhe.observacoes}</div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: muted, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Actualizar estado:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(statusCores).map(([key, val]) => (
                    <button key={key} onClick={() => actualizarStatus(detalhe.id, key)}
                      disabled={detalhe.status === key}
                      style={{
                        padding: '6px 12px', borderRadius: 20, cursor: detalhe.status === key ? 'default' : 'pointer',
                        background: detalhe.status === key ? val.bg : (darkMode ? '#1E293B' : '#F1F5F9'),
                        color: detalhe.status === key ? val.color : muted,
                        fontSize: 12, fontWeight: detalhe.status === key ? 700 : 400,
                        border: detalhe.status === key ? `2px solid ${val.color}` : `1px solid ${border}`,
                      }}>
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ color: muted, fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Editar observações:</div>
                <textarea
                  defaultValue={detalhe.observacoes || ''}
                  id="obs-editar"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${border}`, fontSize: 13, outline: 'none',
                    background: inputBg, color: text, boxSizing: 'border-box',
                    resize: 'vertical', minHeight: 70,
                  }}
                  placeholder="Adicionar observações..."
                />
                <button
                  onClick={async () => {
                    const obs = document.getElementById('obs-editar').value;
                    try {
                      await axios.put(`${API}/pedidos/${detalhe.id}/observacoes`, { observacoes: obs });
                      mostrarToast('Observações actualizadas!');
                      setDetalhe({ ...detalhe, observacoes: obs });
                      await carregarDados();
                    } catch {
                      mostrarToast('Erro ao actualizar observações', 'erro');
                    }
                  }}
                  style={{ marginTop: 8, padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Guardar observações
                </button>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: `1px solid ${border}`, display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(detalhe)}
                style={{ padding: '10px 18px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                🗑️ Eliminar pedido
              </button>
              <button onClick={() => { gerarReciboPDF(detalhe); mostrarToast('Recibo gerado com sucesso!'); }} style={{
                padding: '10px 18px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>📄 Recibo</button>
              <button onClick={() => setDetalhe(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: muted }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 24, gap: isMobile ? 12 : 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>📋 Pedidos</h1>
          <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>Registe e acompanhe todos os pedidos.</p>
        </div>
        <button onClick={abrirModal} style={{ width: isMobile ? '100%' : 'auto', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Novo Pedido
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: muted }}>🔍</span>
          <input type="text" placeholder="Pesquisar por número ou cliente..."
            value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%', color: text }} />
          {pesquisa && <span onClick={() => setPesquisa('')} style={{ cursor: 'pointer', color: muted }}>✕</span>}
        </div>

        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: text, outline: 'none', cursor: 'pointer' }}>
          <option value="">Todos os estados</option>
          {Object.entries(statusCores).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: muted, whiteSpace: 'nowrap' }}>
          {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: darkMode ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${border}` }}>
              {['Nº Pedido', 'Cliente', 'Data', 'Total', 'Estado', 'Acções'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: muted }}>A carregar...</td></tr>
            ) : pedidosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <div style={{ color: text, fontWeight: 600, marginBottom: 4 }}>
                    {pesquisa || filtroStatus ? 'Nenhum pedido encontrado' : 'Ainda não há pedidos'}
                  </div>
                  <div style={{ color: muted, fontSize: 13 }}>
                    {!pesquisa && !filtroStatus && 'Clica em "+ Novo Pedido" para começar'}
                  </div>
                </td>
              </tr>
            ) : pedidosFiltrados.map((p, i) => {
              const sc = statusCores[p.status] || { bg: '#F1F5F9', color: '#64748B', label: p.status };
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? 'transparent' : darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '12px 16px', color: '#3B82F6', fontWeight: 700 }}>{p.numero}</td>
                  <td style={{ padding: '12px 16px', color: text }}>{p.nome_cliente || p.cliente_nome || '—'}</td>
                  <td style={{ padding: '12px 16px', color: muted }}>{new Date(p.criado_em).toLocaleDateString('pt-MZ')}</td>
                  <td style={{ padding: '12px 16px', color: text, fontWeight: 600 }}>
                    {Number(p.total).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setDetalhe(p)} style={{ padding: '6px 12px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      👁️ Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: muted }}>
        Total de {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} registado{pedidos.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
