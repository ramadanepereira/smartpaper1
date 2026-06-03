/* ── Ajuda ──
 * Guia rápido de utilização do sistema, organizado por módulo.
 * Conteúdo estático (sem interacção com API). */
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Ajuda() {
  const { darkMode } = useAuth();
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';
  const card = darkMode ? '#1E293B' : '#fff';
  const border = darkMode ? '#334155' : '#E2E8F0';

  const seccoes = [
    {
      icon: '👥', titulo: 'Clientes',
      items: [
        'Clique em "+ Novo Cliente" para cadastrar um cliente.',
        'Pesquise por nome, telefone ou email na barra de pesquisa.',
        'Use os botões "Editar" e "Eliminar" para gerir cada cliente.',
      ]
    },
    {
      icon: '🖨️', titulo: 'Serviços',
      items: [
        'Cadastre os serviços que a sua papelaria oferece.',
        'Defina nome, descrição, preço, unidade e categoria.',
        'Os serviços aparecerão na criação de pedidos.',
      ]
    },
    {
      icon: '📋', titulo: 'Pedidos',
      items: [
        'Crie pedidos seleccionando cliente e serviços.',
        'Acompanhe o estado do pedido: Pendente → Em Andamento → Concluído → Entregue.',
        'Clique em "Ver" para detalhes, gerar recibo ou cancelar.',
      ]
    },
    {
      icon: '💳', titulo: 'Pagamentos',
      items: [
        'Registe pagamentos associados a pedidos existentes.',
        'Métodos disponíveis: Dinheiro, M-Pesa, e-Mola.',
        'A taxa de câmbio é actualizada automaticamente.',
      ]
    },
    {
      icon: '📊', titulo: 'Relatórios',
      items: [
        'Visualize relatórios financeiros por período.',
        'Filtre por Hoje, Esta Semana, Este Mês ou Personalizado.',
        'Exporte os dados em formato CSV com o botão "Exportar Relatório".',
      ]
    },
    {
      icon: '👤', titulo: 'Utilizadores',
      items: [
        'Apenas administradores podem gerir utilizadores.',
        'Crie utilizadores com perfil de Operador ou Administrador.',
        'Pode activar/desactivar utilizadores ou alterar perfis.',
      ]
    },
    {
      icon: '🌙', titulo: 'Modo Escuro',
      items: [
        'Alterne entre modo claro e escuro usando o botão no topo.',
        'A preferência é salva automaticamente.',
      ]
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: text, margin: '0 0 6px' }}>❓ Ajuda</h1>
        <p style={{ color: muted, fontSize: 13, margin: 0 }}>
          Guia rápido de utilização do SmartPaper.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {seccoes.map((s, i) => (
          <div key={i} style={{
            background: card, border: `1px solid ${border}`,
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: text, margin: 0 }}>{s.titulo}</h3>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 20px', color: muted, fontSize: 13, lineHeight: 1.8 }}>
              {s.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 24, background: card, border: `1px solid ${border}`,
        borderRadius: 12, padding: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: muted }}>
          Precisa de mais ajuda? Contacte o administrador do sistema.
        </div>
        <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
          SmartPaper © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
