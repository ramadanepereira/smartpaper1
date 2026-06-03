/* ── Sobre ──
 * Página informativa sobre o SmartPaper: versão, licença e funcionalidades.
 * Conteúdo estático, sem interacção com API. */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Sobre() {
  const { darkMode } = useAuth();
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';
  const card = darkMode ? '#1E293B' : '#fff';
  const border = darkMode ? '#334155' : '#E2E8F0';

  const versao = '1.0.0';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 680, margin: '0 auto' }}>
      <div style={{
        background: card, border: `1px solid ${border}`,
        borderRadius: 16, padding: 40, textAlign: 'center',
      }}>
        <img
          src={logo}
          alt="SmartPaper"
          style={{
            height: 64, width: 'auto', objectFit: 'contain',
            display: 'block', margin: '0 auto 12px',
            filter: darkMode ? 'brightness(0) invert(1)' : 'none',
          }}
        />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: text, margin: '0 0 4px' }}>SmartPaper</h1>
        <p style={{ color: muted, fontSize: 13, margin: '0 0 20px', fontStyle: 'italic' }}>
          Gestão Inteligente de Impressão e Papelaria
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: muted }}>Versão</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: text }}>{versao}</div>
          </div>
          <div style={{ width: 1, background: border }} />
          <div>
            <div style={{ fontSize: 11, color: muted }}>Licença</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: text }}>MIT</div>
          </div>
        </div>

        <div style={{
          background: darkMode ? '#0F172A' : '#F8FAFC',
          borderRadius: 10, padding: 20, textAlign: 'left',
          fontSize: 13, color: muted, lineHeight: 1.8,
        }}>
          <p style={{ margin: '0 0 12px' }}>
            O <strong style={{ color: text }}>SmartPaper</strong> é um sistema de gestão empresarial
            desenvolvido especialmente para reprografias e papelarias em Moçambique.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Funcionalidades principais:
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li>Registo e gestão de clientes</li>
            <li>Catálogo de serviços com preços</li>
            <li>Criação e acompanhamento de pedidos</li>
            <li>Pagamentos com M-Pesa, e-Mola e dinheiro</li>
            <li>Relatórios financeiros e exportação CSV</li>
            <li>Gestão de utilizadores com perfis</li>
            <li>Emissão de recibos em PDF</li>
          </ul>
          <p style={{ margin: 0 }}>
            Desenvolvido com React, Node.js e SQLite/PostgreSQL.
          </p>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: muted }}>
          © {new Date().getFullYear()} SmartPaper. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
