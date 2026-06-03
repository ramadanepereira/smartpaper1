import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import axios from 'axios';

/* ── Clientes ──
 * CRUD completo: criar, listar, editar e eliminar clientes.
 * Barra de pesquisa filtra por nome, telefone ou email.
 * Modal de formulário com validação (nome, telefone, endereço obrigatórios).
 * Toast flutuante para feedback visual de operações. */

const clienteVazio = {
  nome: '', telefone: '', email: '',
  tipo: 'particular', nuit: '', endereco: '', notas: ''
};

/* ── Toast ──
 * Notificação temporária (3.5s) que aparece no canto superior direito.
 * Aceita "sucesso" (verde) ou "erro" (vermelho). */
function Toast({ mensagem, tipo, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);

  const cores = {
    sucesso: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', icon: '✅' },
    erro: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', icon: '❌' },
  };
  const c = cores[tipo] || cores.sucesso;

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '14px 18px', fontSize: 13, fontWeight: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 280,
    }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{mensagem}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>✕</span>
    </div>
  );
}

export default function Clientes() {
  const { darkMode, API } = useAuth();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [clientes, setClientes] = useState([]);
  const [pesquisa, setPesquisa] = useState(searchParams.get('search') || '');
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(clienteVazio);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const border = darkMode ? '#334155' : '#E2E8F0';
  const card = darkMode ? '#1E293B' : '#fff';
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';

  /* ── Carrega lista de clientes da API ao montar ── */
  useEffect(() => { carregarClientes(); }, []);

  async function carregarClientes() {
    try {
      const res = await axios.get(`${API}/clientes`);
      setClientes(res.data);
    } catch { } finally { setCarregando(false); }
  }

  /* ── Filtro local: pesquisa por nome, telefone ou email ──
   * O termo de pesquisa pode vir da URL (searchParams) ou do input. */
  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
    (c.telefone || '').includes(pesquisa) ||
    (c.email || '').toLowerCase().includes(pesquisa.toLowerCase())
  );

  function mostrarToast(mensagem, tipo = 'sucesso') {
    setToast({ mensagem, tipo });
  }

  /* ── Validação do formulário: nome, telefone e endereço obrigatórios ── */
  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (!form.endereco.trim()) e.endereco = 'Endereço é obrigatório';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  function abrirNovo() {
    setForm(clienteVazio);
    setEditando(null);
    setErros({});
    setModal(true);
  }

  function abrirEditar(c) {
    setForm({
      nome: c.nome, telefone: c.telefone || '', email: c.email || '',
      tipo: c.tipo, nuit: c.nuit || '', endereco: c.endereco || '', notas: c.notas || ''
    });
    setEditando(c.id);
    setErros({});
    setModal(true);
  }

  /* ── Cria ou actualiza cliente conforme o modo (editando vs novo) ──
   * O backend regista a operação na tabela de actividades (audit log). */
  async function salvar() {
    if (!validar()) return;
    setSalvando(true);
    try {
      if (editando) {
        await axios.put(`${API}/clientes/${editando}`, form);
        mostrarToast('Dados do cliente actualizados com sucesso!');
      } else {
        await axios.post(`${API}/clientes`, form);
        mostrarToast('Cliente adicionado com sucesso!');
      }
      await carregarClientes();
      setModal(false);
    } catch (err) {
      mostrarToast(err.response?.data?.erro || 'Erro ao salvar cliente', 'erro');
    } finally { setSalvando(false); }
  }

  /* ── Elimina cliente com confirmação prévia ── */
  async function eliminar(cliente) {
    const id = cliente.id || cliente;
    try {
      await axios.delete(`${API}/clientes/${id}`);
      await carregarClientes();
      setConfirmDelete(null);
      mostrarToast('Cliente removido com sucesso!');
    } catch {
      mostrarToast('Erro ao remover cliente', 'erro');
    }
  }

  const inputStyle = (campo) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${erros[campo] ? '#EF4444' : border}`,
    fontSize: 13, outline: 'none',
    background: darkMode ? '#0F172A' : '#fff',
    color: text, boxSizing: 'border-box'
  });

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: text, marginBottom: 5, textAlign: 'left'
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: card, borderRadius: 12, padding: 28, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: text, fontSize: 16, textAlign: 'center', margin: '0 0 8px' }}>Eliminar cliente?</h3>
            <p style={{ color: muted, fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>
              Tens a certeza que queres eliminar <strong style={{ color: text }}>{confirmDelete?.nome || 'este cliente'}</strong>?<br />
              Esta acção não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => eliminar(confirmDelete)} style={{ flex: 1, padding: '10px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Sim, eliminar
              </button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: card, borderRadius: 16, padding: 32, width: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>
                {editando ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
              </h3>
              <span onClick={() => setModal(false)} style={{ cursor: 'pointer', color: muted, fontSize: 20 }}>✕</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome completo <span style={{ color: '#EF4444' }}>*</span></label>
                <input style={inputStyle('nome')} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: João da Silva" />
                {erros.nome && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.nome}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Telefone <span style={{ color: '#EF4444' }}>*</span></label>
                  <input style={inputStyle('telefone')} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="Ex: +258 84 000 0000" />
                  {erros.telefone && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.telefone}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle('email')} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Ex: joao@email.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select style={inputStyle('tipo')} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="particular">Particular</option>
                    <option value="empresa">Empresa</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>NUIT</label>
                  <input style={inputStyle('nuit')} value={form.nuit} onChange={e => setForm({ ...form, nuit: e.target.value })} placeholder="Ex: 123456789" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Endereço <span style={{ color: '#EF4444' }}>*</span></label>
                <input style={inputStyle('endereco')} value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Ex: Av. Eduardo Mondlane, nº 123" />
                {erros.endereco && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.endereco}</div>}
              </div>

              <div>
                <label style={labelStyle}>Notas</label>
                <textarea style={{ ...inputStyle('notas'), height: 80, resize: 'vertical' }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Observações sobre o cliente..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: '11px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'A salvar...' : editando ? 'Guardar alterações' : 'Adicionar cliente'}
              </button>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '11px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 24, gap: isMobile ? 12 : 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>👥 Clientes</h1>
          <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>Gerencie todos os seus clientes cadastrados.</p>
        </div>
        <button onClick={abrirNovo} style={{ width: isMobile ? '100%' : 'auto', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Novo Cliente
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: muted }}>🔍</span>
          <input
            type="text" placeholder="Pesquisar por nome, telefone ou email..."
            value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%', color: text }}
          />
          {pesquisa && <span onClick={() => setPesquisa('')} style={{ cursor: 'pointer', color: muted, fontSize: 16 }}>✕</span>}
        </div>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: muted, whiteSpace: 'nowrap' }}>
          {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: darkMode ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${border}` }}>
              {['Nome', 'Telefone', 'Email', 'Tipo', 'NUIT', 'Acções'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: muted }}>A carregar...</td></tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                  <div style={{ color: text, fontWeight: 600, marginBottom: 4 }}>
                    {pesquisa ? 'Nenhum cliente encontrado' : 'Ainda não há clientes'}
                  </div>
                  <div style={{ color: muted, fontSize: 13 }}>
                    {pesquisa ? 'Tenta pesquisar com outros termos' : 'Clica em "+ Novo Cliente" para começar'}
                  </div>
                </td>
              </tr>
            ) : clientesFiltrados.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? 'transparent' : darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1E40AF', flexShrink: 0 }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: text, fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
                      {c.endereco && <div style={{ color: muted, fontSize: 11 }}>{c.endereco}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: text }}>{c.telefone || '—'}</td>
                <td style={{ padding: '12px 16px', color: text }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: c.tipo === 'empresa' ? '#EDE9FE' : '#D1FAE5', color: c.tipo === 'empresa' ? '#4C1D95' : '#065F46', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                    {c.tipo === 'empresa' ? '🏢 Empresa' : '👤 Particular'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: muted }}>{c.nuit || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => abrirEditar(c)} style={{ padding: '6px 12px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => setConfirmDelete(c)} style={{ padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: muted }}>
        Total de {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
