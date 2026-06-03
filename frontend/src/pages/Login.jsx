import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import operador from '../assets/operador.png';
import logo from '../assets/logo.png';

/* ── Login ──
 * Página de autenticação com dois painéis:
 * - Esquerdo (decorativo): boas-vindas + imagem + features (oculto em mobile)
 * - Direito: formulário de login com suporte a "lembrar-me", toggle de senha,
 *   recuperação de acesso e atalho para login como administrador.
 * O darkMode aqui é independente do contexto (não requer autenticação prévia). */
export default function Login() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mostraEsqueceu, setMostraEsqueceu] = useState(false);
  const [usernameRecuperar, setUsernameRecuperar] = useState('');
  const [mensagemRecuperar, setMensagemRecuperar] = useState('');
  const [mostraModalAdmin, setMostraModalAdmin] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [erroAdmin, setErroAdmin] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  /* ── Login padrão com username/password ──
   * Se "lembrar" estiver marcado, guarda o username no localStorage. */
  async function handleLogin(e) {
    e.preventDefault();
    if (!username || !password) { setErro('Username e password são obrigatórios'); return; }
    setErro('');
    setCarregando(true);
    try {
      await login(username, password);
      if (lembrar) localStorage.setItem('sp_username', username);
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  }

  /* ── Acesso rápido como admin (modal separado) ──
   * Fixa o username como "admin" e pede apenas a senha. */
  async function acessarComoAdmin() {
    setErroAdmin('');
    if (!senhaAdmin) { setErroAdmin('Insere a senha de administrador.'); return; }
    setCarregando(true);
    try {
      await login('admin', senhaAdmin);
      setMostraModalAdmin(false);
      navigate('/');
    } catch {
      setErroAdmin('Senha incorrecta.');
    } finally {
      setCarregando(false);
    }
  }

  /* ── "Esqueceu-se" — funcionalidade simulada ──
   * Apenas exibe mensagem de confirmação; não faz chamada real à API. */
  function handleEsqueceu(e) {
    e.preventDefault();
    if (!usernameRecuperar) { setMensagemRecuperar('Insere o nome de utilizador.'); return; }
    setMensagemRecuperar('Pedido enviado. O administrador será notificado para repor a tua senha.');
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      fontFamily: "'Inter', sans-serif", overflow: 'hidden',
      background: darkMode ? '#0A1628' : '#0A1628'
    }}>

      {/* ── TOGGLE MODO ESCURO ── */}
      <div style={{
        position: 'fixed', top: 5, right: 15, zIndex: 999,
        display: 'flex', alignItems: 'center', gap: 3,
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 30, padding: '1px 1px',
        backdropFilter: 'blur(8px)'
      }}>
        <span style={{ fontSize: 20 }}>🌙</span>
        <div
          onClick={() => setDarkMode(!darkMode)}
          style={{
            width: 38, height: 20, borderRadius: 10,
            background: '#3B82F6', cursor: 'pointer',
            position: 'relative', flexShrink: 0
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: darkMode ? 20 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s'
          }} />
        </div>
      </div>

      {/* ── PAINEL ESQUERDO: bem-vindo + imagem ── */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #081830 0%, #0D2545 40%, #1a3a6b 100%)',
        display: isMobile ? 'none' : 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 40px',
      }}>
        {/* Círculos decorativos ao fundo */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 350, height: 350, borderRadius: '50%',
          border: '1px solid rgba(59,130,246,0.15)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: -50, right: -50,
          width: 220, height: 220, borderRadius: '50%',
          border: '1px solid rgba(59,130,246,0.1)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Pontos decorativos no canto sup esquerdo */}
        <div style={{
          position: 'absolute', top: 50, left: 40,
          display: 'grid', gridTemplateColumns: 'repeat(6, 10px)', gap: 8,
          pointerEvents: 'none'
        }}>
          {Array(30).fill(0).map((_, i) => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(59,130,246,0.4)'
            }} />
          ))}
        </div>

        {/* Mensagem de boas-vindas estilizada */}
        <div style={{ position: 'relative', zIndex: 3, maxWidth: 460 }}>
          <div style={{
            fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 16,
            lineHeight: 1.2, letterSpacing: -0.5,
          }}>
            Bem vindo de volta <span style={{ display: 'inline-block' }}>👋</span>
          </div>
          <div style={{
            fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7,
            maxWidth: 380, marginBottom: 32,
          }}>
            Acesse a sua conta para continuar gerenciando seu negócio de forma inteligente.
          </div>

          {/* Feature highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🖨️', text: 'Gestão completa de pedidos e serviços' },
              { icon: '💳', text: 'Pagamentos via M-Pesa, e-Mola e dinheiro' },
              { icon: '📊', text: 'Relatórios financeiros detalhados' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px',
                backdropFilter: 'blur(4px)',
              }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Imagem do operador */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '45%', height: '100%',
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 200,
            background: 'linear-gradient(to top, #0D2545 0%, transparent 100%)',
            zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: 100,
            background: 'linear-gradient(to right, #0D2545 0%, transparent 100%)',
            zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 60,
            background: 'linear-gradient(to left, #081830 0%, transparent 100%)',
            zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 120,
            background: 'linear-gradient(to bottom, #081830 0%, transparent 100%)',
            zIndex: 2,
          }} />
          <img
            src={operador}
            alt="Operador SmartPaper"
            style={{
              height: '100%', width: '100%',
              objectFit: 'cover', objectPosition: 'center top',
              position: 'relative', zIndex: 1, opacity: 0.85,
            }}
          />
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          textAlign: 'center', fontSize: 11,
          color: 'rgba(255,255,255,0.3)', letterSpacing: 0.2, zIndex: 4,
        }}>
          © {new Date().getFullYear()} SmartPaper — Gestão Inteligente de Impressão e Papelaria.
        </div>
      </div>

      {/* ── PAINEL DIREITO: formulário de login ── */}
      <div style={{
        width: isMobile ? '100%' : 500, flexShrink: 0,
        background: darkMode ? '#111827' : '#F0F4F8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '24px 16px' : '32px 28px', overflowY: 'auto'
      }}>

        {/* Modal — Esqueceu senha */}
        {mostraEsqueceu && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500
          }}>
            <div style={{
              background: darkMode ? '#1E293B' : '#fff', borderRadius: 12,
              padding: '32px', width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.25)'
            }}>
              <h3 style={{ color: darkMode ? '#F1F5F9' : '#1E293B', fontSize: 16, margin: '0 0 8px' }}>
                Recuperar acesso
              </h3>
              <p style={{ color: darkMode ? '#94A3B8' : '#64748B', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                Insere o teu nome de utilizador e o administrador será notificado para repor a tua senha.
              </p>
              <input
                type="text"
                placeholder="Nome de utilizador"
                value={usernameRecuperar}
                onChange={e => setUsernameRecuperar(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #E2E8F0', fontSize: 13, marginBottom: 10,
                  boxSizing: 'border-box', outline: 'none',
                  background: darkMode ? '#0F172A' : '#fff',
                  color: darkMode ? '#F1F5F9' : '#1E293B'
                }}
              />
              {mensagemRecuperar && (
                <div style={{
                  background: '#D1FAE5', color: '#065F46', borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, marginBottom: 12
                }}>{mensagemRecuperar}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleEsqueceu} style={{
                  flex: 1, padding: '10px', background: '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
                }}>Enviar pedido</button>
                <button onClick={() => { setMostraEsqueceu(false); setMensagemRecuperar(''); setUsernameRecuperar(''); }} style={{
                  flex: 1, padding: '10px', background: 'transparent',
                  color: darkMode ? '#94A3B8' : '#64748B',
                  border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontSize: 13
                }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal — Acesso administrador com senha */}
        {mostraModalAdmin && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600
          }}>
            <div style={{
              background: darkMode ? '#1E293B' : '#fff', borderRadius: 12,
              padding: 32, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
                <h3 style={{ color: darkMode ? '#F1F5F9' : '#1E293B', fontSize: 16, margin: '0 0 6px' }}>
                  Acesso Administrador
                </h3>
                <p style={{ color: darkMode ? '#94A3B8' : '#64748B', fontSize: 13, margin: 0 }}>
                  Insere a senha de administrador para continuar.
                </p>
              </div>
              <input
                type="password"
                placeholder="Senha do administrador"
                value={senhaAdmin}
                onChange={e => setSenhaAdmin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && acessarComoAdmin()}
                autoFocus
                style={{
                  width: '100%', padding: '11px 12px', borderRadius: 8,
                  border: `1px solid ${erroAdmin ? '#EF4444' : '#E2E8F0'}`,
                  fontSize: 13, marginBottom: 10, boxSizing: 'border-box',
                  outline: 'none', background: darkMode ? '#0F172A' : '#fff',
                  color: darkMode ? '#F1F5F9' : '#1E293B'
                }}
              />
              {erroAdmin && (
                <div style={{
                  background: '#FEE2E2', color: '#DC2626', borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, marginBottom: 10
                }}>{erroAdmin}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={acessarComoAdmin} disabled={carregando} style={{
                  flex: 1, padding: '11px', background: '#2563EB', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, opacity: carregando ? 0.7 : 1
                }}>
                  {carregando ? 'A entrar...' : '→ Entrar'}
                </button>
                <button onClick={() => { setMostraModalAdmin(false); setSenhaAdmin(''); setErroAdmin(''); }} style={{
                  flex: 1, padding: '11px', background: 'transparent',
                  color: darkMode ? '#94A3B8' : '#64748B',
                  border: `1px solid ${darkMode ? '#334155' : '#E2E8F0'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 13
                }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Card do formulário de login */}
        <div style={{
          background: darkMode ? '#1E293B' : '#fff',
          borderRadius: 16, padding: isMobile ? '16px 18px' : '20px 28px',
          width: '100%', maxWidth: 440, boxShadow: '0 4px 32px rgba(0,0,0,0.10)'
        }}>

          {/* ── Logo SmartPaper no topo do card ── */}
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ display: 'inline-block', marginBottom: 4 }}>
              <img
                src={logo} alt="SmartPaper"
                style={{
                  height: 80, width: 'auto',
                  objectFit: 'contain',
                  display: 'block', margin: '0 auto'
                }}
              />
            </div>
            <p style={{ color: darkMode ? '#64748B' : '#94A3B8', fontSize: 12, fontStyle: 'italic', margin: 0 }}>
              Gestão inteligente de impressão e papelaria
            </p>
          </div>



          {/* ── Formulário ── */}
          <form onSubmit={handleLogin}>
            {/* Campo username */}
            <div style={{ marginBottom: 10 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: darkMode ? '#F1F5F9' : '#1E293B', marginBottom: 6,
                textAlign: 'left'
              }}>
                Nome de utilizador
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: darkMode ? '#475569' : '#94A3B8', fontSize: 15
                }}>👤</span>
                <input
                  type="text"
                  placeholder="seu_utilizador"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 12px 11px 38px',
                    borderRadius: 8, border: `1px solid ${darkMode ? '#334155' : '#E2E8F0'}`,
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    background: darkMode ? '#0F172A' : '#fff',
                    color: darkMode ? '#F1F5F9' : '#1E293B'
                  }}
                />
              </div>
            </div>

            {/* Campo senha com toggle de visibilidade (ícone de olho) */}
            <div style={{ marginBottom: 10 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: darkMode ? '#F1F5F9' : '#1E293B', marginBottom: 6,
                textAlign: 'left'
              }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: darkMode ? '#475569' : '#94A3B8', fontSize: 15
                }}>🔒</span>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 40px 11px 38px',
                    borderRadius: 8, border: `1px solid ${darkMode ? '#334155' : '#E2E8F0'}`,
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    background: darkMode ? '#0F172A' : '#fff',
                    color: darkMode ? '#F1F5F9' : '#1E293B'
                  }}
                />
                {/* Ícone de olho para mostrar/ocultar senha */}
                <span
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer', fontSize: 16, userSelect: 'none',
                    color: darkMode ? '#94A3B8' : '#64748B'
                  }}
                >
                  {mostrarPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </div>
            </div>

            {/* Lembrar-me + link Esqueceu senha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: darkMode ? '#94A3B8' : '#64748B', cursor: 'pointer'
              }}>
                <input
                  type="checkbox" checked={lembrar}
                  onChange={e => setLembrar(e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                Lembrar-me
              </label>
              <span
                onClick={() => setMostraEsqueceu(true)}
                style={{ fontSize: 13, color: '#3B82F6', cursor: 'pointer', fontWeight: 500 }}
              >
                Esqueceu o nome de utilizador ou senha?
              </span>
            </div>

            {/* Mensagem de erro */}
            {erro && (
              <div style={{
                background: '#FEE2E2', color: '#DC2626', borderRadius: 8,
                padding: '10px 12px', fontSize: 13, marginBottom: 14
              }}>{erro}</div>
            )}

            {/* Botão Entrar */}
            <button type="submit" disabled={carregando} style={{
              width: '100%', padding: '13px',
              background: '#2563EB', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14,
              fontWeight: 600, cursor: carregando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: carregando ? 0.7 : 1, marginBottom: 10
            }}>
              <span>⇒</span> {carregando ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          {/* ── Separador "ou" ── */}
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: 10 }}>
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0,
              height: 1, background: darkMode ? '#334155' : '#E2E8F0'
            }} />
            <span style={{
              position: 'relative', background: darkMode ? '#1E293B' : '#fff',
              padding: '0 12px', fontSize: 13,
              color: darkMode ? '#475569' : '#94A3B8'
            }}>ou</span>
          </div>

          {/* ── Acesso rápido como Administrador ──
           * Abre modal que fixa username="admin" e pede apenas a senha. */}
          <div onClick={() => { setMostraModalAdmin(true); setSenhaAdmin(''); setErroAdmin(''); }} style={{
            border: `1px solid ${darkMode ? '#334155' : '#E2E8F0'}`,
            borderRadius: 8, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', marginBottom: 12,
            background: darkMode ? '#0F172A' : '#fff'
          }}>
            <span style={{ fontSize: 22 }}>👤</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: darkMode ? '#64748B' : '#94A3B8' }}>Acesso rápido</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#F1F5F9' : '#1E293B' }}>
                Acessar como Administrador
              </div>
            </div>
            <span style={{ color: darkMode ? '#64748B' : '#94A3B8', fontSize: 20 }}>›</span>
          </div>
        </div>
      </div>
    </div>
  );
}
