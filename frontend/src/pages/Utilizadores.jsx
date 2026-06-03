/* ── Utilizadores ──
 * Gestão de utilizadores do sistema (admin/operador).
 * CRUD completo + activar/desactivar + alternar perfil.
 * Apenas administradores (RotaAdmin em App.jsx).
 * O admin padrão "admin" não pode ser removido via interface. */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';

const inputStyle = (erro) => ({
  width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${erro ? '#EF4444' : '#E2E8F0'}`,
  fontSize: 13, outline: 'none', background: '#fff', color: '#1E293B', transition: 'border-color 0.2s',
});
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 };
const selectStyle = { ...inputStyle(), padding: '9px 14px' };

// ─── Toast (notificação flutuante) ───────────────────────
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

// ─── Modal (janela modal reutilizável) ──────────────────
function Modal({ titulo, children, onClose, maxWidth }) {
  const { darkMode } = useAuth();
  const bg = darkMode ? '#1E293B' : '#fff';
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: bg, borderRadius: 16, padding: 28, maxWidth: maxWidth || 520, width: '100%',
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

// ─── Componente principal ────────────────────────────────
export default function Utilizadores() {
  const { darkMode, API } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // ─── Estado ──────────────────────────────────────────────
  const [utilizadores, setUtilizadores] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ nome: '', username: '', password: '', perfil: 'operador' });
  const [erros, setErros] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  // ─── Tema (cores dinâmicas) ──────────────────────────────
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';
  const cardBg = darkMode ? '#1E293B' : '#fff';
  const border = darkMode ? '#334155' : '#E2E8F0';

  // ─── Carregar utilizadores da API ────────────────────────
  const carregar = useCallback(() => {
    axios.get(`${API}/utilizadores`).then(r => setUtilizadores(r.data)).catch(() => {});
  }, [API]);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Utilitário: notificação ─────────────────────────────
  const showToast = (msg, tipo) => setToast({ mensagem: msg, tipo });

  // ─── Validação do formulário ─────────────────────────────
  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    if (!form.username.trim()) e.username = 'Obrigatório';
    if (modal === 'criar' && !form.password) e.password = 'Obrigatório';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  // ─── Guardar (criar/editar) utilizador ───────────────────
  const handleSave = async () => {
    if (!validar()) return;
    try {
      if (modal === 'editar') {
        const data = { nome: form.nome, username: form.username, perfil: form.perfil };
        if (form.password) data.password = form.password;
        await axios.put(`${API}/utilizadores/${form.id}`, data);
        showToast('Utilizador actualizado', 'sucesso');
      } else {
        await axios.post(`${API}/utilizadores`, form);
        showToast('Utilizador criado com sucesso', 'sucesso');
      }
      setModal(null); carregar();
    } catch (err) { showToast(err.response?.data?.erro || 'Erro ao salvar', 'erro'); }
  };

  // ─── Alternar estado activo/inactivo ─────────────────────
  const toggleAtivo = async (u) => {
    try {
      await axios.put(`${API}/utilizadores/${u.id}/ativo`);
      showToast(u.ativo ? 'Utilizador desactivado' : 'Utilizador activado', 'sucesso');
      carregar();
    } catch (err) { showToast('Erro', 'erro'); }
  };

  // ─── Alternar perfil admin/operador ──────────────────────
  const togglePerfil = async (u) => {
    try {
      await axios.put(`${API}/utilizadores/${u.id}/perfil`);
      showToast(`Perfil alterado para ${u.perfil === 'admin' ? 'operador' : 'admin'}`, 'sucesso');
      carregar();
    } catch (err) { showToast('Erro', 'erro'); }
  };

  // ─── Abrir modal de edição ──────────────────────────────
  const abrirEditar = (u) => {
    setForm({ id: u.id, nome: u.nome, username: u.username, password: '', perfil: u.perfil });
    setErros({});
    setModal('editar');
  };

  // ─── Abrir modal de criação ─────────────────────────────
  const abrirCriar = () => {
    setForm({ nome: '', username: '', password: '', perfil: 'operador' });
    setErros({});
    setModal('criar');
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      {/* ─── Cabeçalho ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: isMobile ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: text }}>Utilizadores</div>
          <div style={{ fontSize: 13, color: muted }}>Total: {utilizadores.length} utilizador(es)</div>
        </div>
        <button onClick={abrirCriar} style={{
          width: isMobile ? '100%' : 'auto', padding: '10px 20px', background: '#2563EB', color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>+ Novo Utilizador</button>
      </div>
      {/* ─── Tabela de utilizadores ──────────────────────────── */}
      <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
        <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${border}` }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Username</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Perfil</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: muted, fontWeight: 600 }}>Estado</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: muted, fontWeight: 600 }}>Acções</th>
            </tr>
          </thead>
          <tbody>
            {utilizadores.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: text }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: u.perfil === 'admin' ? '#8B5CF6' : '#2563EB',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>{u.nome.charAt(0).toUpperCase()}</div>
                    {u.nome}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: muted }}>{u.username}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: u.perfil === 'admin' ? '#E0E7FF' : '#D1FAE5',
                    color: u.perfil === 'admin' ? '#3730A3' : '#065F46',
                  }}>{u.perfil}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: u.ativo ? '#D1FAE5' : '#FEE2E2',
                    color: u.ativo ? '#065F46' : '#991B1B',
                  }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <span onClick={() => abrirEditar(u)} style={{ color: '#2563EB', cursor: 'pointer', marginRight: 12, fontSize: 12, fontWeight: 500 }}>Editar</span>
                  <span onClick={() => setConfirmAction({ type: 'perfil', user: u })}
                    style={{ color: '#F59E0B', cursor: 'pointer', marginRight: 12, fontSize: 12, fontWeight: 500 }}>Perfil</span>
                  <span onClick={() => setConfirmAction({ type: 'ativo', user: u })}
                    style={{ color: u.ativo ? '#EF4444' : '#10B981', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                    {u.ativo ? 'Desactivar' : 'Activar'}
                  </span>
                </td>
              </tr>
            ))}
            {utilizadores.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: muted }}>Nenhum utilizador encontrado</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      {/* ─── Modal: Formulário ──────────────────────────────────── */}
      {(modal === 'criar' || modal === 'editar') && (
        <Modal titulo={modal === 'criar' ? 'Novo Utilizador' : 'Editar Utilizador'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                style={{ ...inputStyle(erros.nome), background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: erros.nome ? '#EF4444' : border }} />
              {erros.nome && <span style={{ fontSize: 11, color: '#EF4444' }}>{erros.nome}</span>}
            </div>
            <div>
              <label style={labelStyle}>Username *</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                style={{ ...inputStyle(erros.username), background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: erros.username ? '#EF4444' : border }} />
              {erros.username && <span style={{ fontSize: 11, color: '#EF4444' }}>{erros.username}</span>}
            </div>
            <div>
              <label style={labelStyle}>{modal === 'editar' ? 'Nova Password (deixar vazio para manter)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ ...inputStyle(erros.password), background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: erros.password ? '#EF4444' : border }} />
              {erros.password && <span style={{ fontSize: 11, color: '#EF4444' }}>{erros.password}</span>}
            </div>
            <div>
              <label style={labelStyle}>Perfil</label>
              <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}
                style={{ ...selectStyle, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }}>
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                padding: '10px 20px', borderRadius: 8, border: `1px solid ${border}`,
                background: 'transparent', color: text, cursor: 'pointer', fontSize: 13,
              }}>Cancelar</button>
              <button onClick={handleSave} style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#2563EB', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
      {/* ─── Modal: Confirmação ──────────────────────────────────── */}
      {confirmAction && (
        <Modal titulo="Confirmar Acção" onClose={() => setConfirmAction(null)} maxWidth={400}>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            {confirmAction.type === 'perfil' && <>Deseja alterar o perfil de <strong>{confirmAction.user.nome}</strong> para <strong>{confirmAction.user.perfil === 'admin' ? 'operador' : 'admin'}</strong>?</>}
            {confirmAction.type === 'ativo' && <>Deseja {confirmAction.user.ativo ? 'desactivar' : 'activar'} o utilizador <strong>{confirmAction.user.nome}</strong>?</>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmAction(null)} style={{
              padding: '10px 20px', borderRadius: 8, border: `1px solid ${border}`,
              background: 'transparent', color: text, cursor: 'pointer', fontSize: 13,
            }}>Cancelar</button>
            <button onClick={async () => {
              if (confirmAction.type === 'perfil') await togglePerfil(confirmAction.user);
              if (confirmAction.type === 'ativo') await toggleAtivo(confirmAction.user);
              setConfirmAction(null);
            }} style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: confirmAction.type === 'ativo' && !confirmAction.user.ativo ? '#10B981' : '#F59E0B',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>Confirmar</button>
          </div>
        </Modal>
      )}
      {/* ─── Toast flutuante ────────────────────────────────────── */}
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
