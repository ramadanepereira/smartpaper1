import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import axios from 'axios';

/* ── Serviços ──
 * CRUD completo de serviços (impressão, cópia, acabamento, etc.).
 * Cada serviço tem nome, descrição, preço, unidade e categoria.
 * Os filtros de pesquisa e categoria são aplicados no frontend (client-side). */

const servicoVazio = {
  nome: '', descricao: '', preco: '', unidade: 'unidade', categoria: 'impressao'
};

const categorias = [
  { value: 'impressao', label: '🖨️ Impressão' },
  { value: 'copia', label: '📄 Cópia' },
  { value: 'acabamento', label: '✂️ Acabamento' },
  { value: 'outro', label: '📦 Outro' },
];

const unidades = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'pagina', label: 'Página' },
  { value: 'folha', label: 'Folha' },
];

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

export default function Servicos() {
  const { darkMode, API } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [servicos, setServicos] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(servicoVazio);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const border = darkMode ? '#334155' : '#E2E8F0';
  const card = darkMode ? '#1E293B' : '#fff';
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';

  /* ── Carrega serviços da API ao montar ── */
  useEffect(() => { carregarServicos(); }, []);

  async function carregarServicos() {
    try {
      const res = await axios.get(`${API}/servicos`);
      setServicos(res.data);
    } catch { } finally { setCarregando(false); }
  }

  /* ── Filtro combinado: texto + categoria (client-side) ── */
  const servicosFiltrados = servicos.filter(s => {
    const matchPesquisa = s.nome.toLowerCase().includes(pesquisa.toLowerCase());
    const matchCategoria = filtroCategoria ? s.categoria === filtroCategoria : true;
    return matchPesquisa && matchCategoria;
  });

  function mostrarToast(mensagem, tipo = 'sucesso') { setToast({ mensagem, tipo }); }

  /* ── Validação: nome obrigatório e preço deve ser número positivo ── */
  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!form.preco || isNaN(form.preco) || Number(form.preco) <= 0) e.preco = 'Preço válido é obrigatório';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  function abrirNovo() {
    setForm(servicoVazio); setEditando(null); setErros({}); setModal(true);
  }

  function abrirEditar(s) {
    setForm({ nome: s.nome, descricao: s.descricao || '', preco: s.preco, unidade: s.unidade, categoria: s.categoria });
    setEditando(s.id); setErros({}); setModal(true);
  }

  /* ── Cria ou actualiza serviço (preco convertido para Number) ── */
  async function salvar() {
    if (!validar()) return;
    setSalvando(true);
    try {
      if (editando) {
        await axios.put(`${API}/servicos/${editando}`, { ...form, preco: Number(form.preco) });
        mostrarToast('Serviço actualizado com sucesso!');
      } else {
        await axios.post(`${API}/servicos`, { ...form, preco: Number(form.preco) });
        mostrarToast('Serviço adicionado com sucesso!');
      }
      await carregarServicos();
      setModal(false);
    } catch (err) {
      mostrarToast(err.response?.data?.erro || 'Erro ao salvar', 'erro');
    } finally { setSalvando(false); }
  }

  async function eliminar(id) {
    try {
      await axios.delete(`${API}/servicos/${id}`);
      await carregarServicos();
      setConfirmDelete(null);
      mostrarToast('Serviço removido com sucesso!');
    } catch { mostrarToast('Erro ao remover serviço', 'erro'); }
  }

  const inputStyle = (campo) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${erros[campo] ? '#EF4444' : border}`,
    fontSize: 13, outline: 'none',
    background: darkMode ? '#0F172A' : '#fff',
    color: text, boxSizing: 'border-box'
  });

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5, textAlign: 'left' };

  const categoriaCores = {
    impressao: { bg: '#DBEAFE', color: '#1E40AF', label: '🖨️ Impressão' },
    copia: { bg: '#D1FAE5', color: '#065F46', label: '📄 Cópia' },
    acabamento: { bg: '#FEF3C7', color: '#92400E', label: '✂️ Acabamento' },
    outro: { bg: '#EDE9FE', color: '#4C1D95', label: '📦 Outro' },
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: card, borderRadius: 12, padding: 28, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: text, fontSize: 16, textAlign: 'center', margin: '0 0 8px' }}>Eliminar serviço?</h3>
            <p style={{ color: muted, fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>
              Tens a certeza que queres eliminar <strong style={{ color: text }}>{confirmDelete?.nome || 'este serviço'}</strong>?<br />
              Esta acção não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => eliminar(confirmDelete?.id || confirmDelete)} style={{ flex: 1, padding: '10px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Sim, eliminar</button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: card, borderRadius: 16, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>
                {editando ? '✏️ Editar Serviço' : '➕ Novo Serviço'}
              </h3>
              <span onClick={() => setModal(false)} style={{ cursor: 'pointer', color: muted, fontSize: 20 }}>✕</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome do serviço <span style={{ color: '#EF4444' }}>*</span></label>
                <input style={inputStyle('nome')} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Impressão A4 Preto e Branco" />
                {erros.nome && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.nome}</div>}
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea style={{ ...inputStyle('descricao'), height: 70, resize: 'vertical' }} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional do serviço..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Preço (MT) <span style={{ color: '#EF4444' }}>*</span></label>
                  <input style={inputStyle('preco')} type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} placeholder="Ex: 5.00" />
                  {erros.preco && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{erros.preco}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Unidade</label>
                  <select style={inputStyle('unidade')} value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}>
                    {unidades.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Categoria</label>
                <select style={inputStyle('categoria')} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: '11px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'A salvar...' : editando ? 'Guardar alterações' : 'Adicionar serviço'}
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>🖨️ Serviços</h1>
          <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>Gerencie os serviços oferecidos pela sua papelaria.</p>
        </div>
        <button onClick={abrirNovo} style={{ width: isMobile ? '100%' : 'auto', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Novo Serviço
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: muted }}>🔍</span>
          <input type="text" placeholder="Pesquisar serviço..." value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%', color: text }} />
          {pesquisa && <span onClick={() => setPesquisa('')} style={{ cursor: 'pointer', color: muted }}>✕</span>}
        </div>

        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: text, outline: 'none', cursor: 'pointer' }}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: muted, whiteSpace: 'nowrap' }}>
          {servicosFiltrados.length} serviço{servicosFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: darkMode ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${border}` }}>
              {['Serviço', 'Categoria', 'Preço', 'Unidade', 'Acções'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: muted }}>A carregar...</td></tr>
            ) : servicosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖨️</div>
                  <div style={{ color: text, fontWeight: 600, marginBottom: 4 }}>
                    {pesquisa || filtroCategoria ? 'Nenhum serviço encontrado' : 'Ainda não há serviços'}
                  </div>
                  <div style={{ color: muted, fontSize: 13 }}>
                    {pesquisa || filtroCategoria ? 'Tenta com outros filtros' : 'Clica em "+ Novo Serviço" para começar'}
                  </div>
                </td>
              </tr>
            ) : servicosFiltrados.map((s, i) => {
              const cat = categoriaCores[s.categoria] || { bg: '#F1F5F9', color: '#64748B', label: s.categoria };
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? 'transparent' : darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: text, fontWeight: 600, fontSize: 13 }}>{s.nome}</div>
                    {s.descricao && <div style={{ color: muted, fontSize: 11, marginTop: 2 }}>{s.descricao}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: cat.bg, color: cat.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                      {cat.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: text, fontWeight: 600 }}>
                    {Number(s.preco).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </td>
                  <td style={{ padding: '12px 16px', color: muted }}>
                    {unidades.find(u => u.value === s.unidade)?.label || s.unidade}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(s)} style={{ padding: '6px 12px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>✏️ Editar</button>
                      <button onClick={() => setConfirmDelete(s)} style={{ padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>🗑️ Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: muted }}>
        Total de {servicos.length} serviço{servicos.length !== 1 ? 's' : ''} cadastrado{servicos.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
