/* ── Relatórios ──
 * Painel administrativo com visão financeira detalhada.
 * KPIs: total faturado, ticket médio, total pendente, novos clientes.
 * Gráficos: faturamento diário (barras), por método (pizza).
 * Tabelas: top serviços, top clientes, pedidos do período.
 * Exportação CSV dos pedidos filtrados por período.
 * Apenas administradores (RotaAdmin). */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const inputStyle = () => ({
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0',
  fontSize: 13, outline: 'none', background: '#fff', color: '#1E293B', transition: 'border-color 0.2s',
});
const selectStyle = { ...inputStyle(), padding: '9px 14px' };

const statusColors = {
  pendente: { bg: '#FEF3C7', text: '#92400E' },
  em_andamento: { bg: '#DBEAFE', text: '#1E40AF' },
  concluido: { bg: '#D1FAE5', text: '#065F46' },
  entregue: { bg: '#E0E7FF', text: '#3730A3' },
  cancelado: { bg: '#FEE2E2', text: '#991B1B' },
};

const hoje = () => new Date().toISOString().split('T')[0];

function periodoData(p) {
  const fim = hoje();
  let inicio;
  switch (p) {
    case 'hoje': inicio = fim; break;
    case 'semana': const d = new Date(); d.setDate(d.getDate() - 7); inicio = d.toISOString().split('T')[0]; break;
    case 'mes': const m = new Date(); m.setMonth(m.getMonth() - 1); inicio = m.toISOString().split('T')[0]; break;
    default: inicio = fim; break;
  }
  return { inicio, fim };
}

export default function Relatorios() {
  const { darkMode, API } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // ─── Estado ──────────────────────────────────────────────
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState(periodoData('mes').inicio);
  const [dataFim, setDataFim] = useState(hoje());
  const [financeiro, setFinanceiro] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // ─── Tema (cores dinâmicas) ──────────────────────────────
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';
  const cardBg = darkMode ? '#1E293B' : '#fff';
  const border = darkMode ? '#334155' : '#E2E8F0';

  // ─── Exportar relatório CSV ─────────────────────────────
  const exportarCSV = useCallback(() => {
    if (pedidos.length === 0) return;
    const cabecalho = 'Nº Pedido,Cliente,Data,Status,Total\n';
    const linhas = pedidos.map(p =>
      `"${p.numero}","${p.nome_cliente || p.cliente_nome || '-'}","${new Date(p.criado_em).toLocaleDateString()}","${p.status}",${p.total}`
    ).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${dataInicio}-a-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [pedidos, dataInicio, dataFim]);

  // ─── Carregar dados da API ───────────────────────────────
  const carregarDados = async (pi, pf) => {
    setCarregando(true);
    try {
      const [resFin, resServ, resCli, resRes, resPed] = await Promise.all([
        axios.get(`${API}/relatorios/financeiro?inicio=${pi}&fim=${pf}`),
        axios.get(`${API}/relatorios/servicos-populares?inicio=${pi}&fim=${pf}`),
        axios.get(`${API}/relatorios/clientes-top?inicio=${pi}&fim=${pf}`),
        axios.get(`${API}/relatorios/resumo-geral?inicio=${pi}&fim=${pf}`),
        axios.get(`${API}/pedidos`),
      ]);
      setFinanceiro(resFin.data);
      setServicos(resServ.data.slice(0, 5));
      setClientes(resCli.data.slice(0, 5));
      setResumo(resRes.data);
      setPedidos(resPed.data.filter(p => {
        const d = p.criado_em?.split(' ')[0];
        return d >= pi && d <= pf;
      }));
    } catch {}
    setCarregando(false);
  };

  useEffect(() => {
    if (periodo !== 'custom') {
      const pd = periodoData(periodo);
      setDataInicio(pd.inicio);
      setDataFim(pd.fim);
      carregarDados(pd.inicio, pd.fim);
    }
  }, [periodo]);

  // ─── Efeito: filtrar por datas personalizadas ──────────
  useEffect(() => {
    if (periodo === 'custom') carregarDados(dataInicio, dataFim);
  }, [dataInicio, dataFim]);

  // ─── Opções de filtro de período ─────────────────────────
  const periods = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Esta Semana' },
    { key: 'mes', label: 'Este Mês' },
    { key: 'custom', label: 'Personalizado' },
  ];

  // ─── Cores para gráfico pizza ───────────────────────────
  const pieColors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: text }}>Relatórios</div>
        {/* ─── Filtros de período ──────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: periodo === p.key ? '#2563EB' : 'transparent',
              color: periodo === p.key ? '#fff' : muted,
              border: `1.5px solid ${periodo === p.key ? '#2563EB' : border}`,
              transition: 'all 0.2s',
            }}>{p.label}</button>
          ))}
          {periodo === 'custom' && (
            <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                style={{ ...inputStyle(), flex: 1, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }} />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                style={{ ...inputStyle(), flex: 1, background: darkMode ? '#0F172A' : '#fff', color: text, borderColor: border }} />
            </div>
          )}
        </div>
      </div>
      {carregando ? (
        <div style={{ textAlign: 'center', padding: 60, color: muted }}>A carregar dados...</div>
      ) : (
        <>
          {/* ─── Cartões KPI ─────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: `1px solid ${border}`, flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: 'uppercase' }}>Total Faturado</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981', marginTop: 4 }}>{financeiro?.totalFaturado?.toLocaleString() || 0} MT</div>
            </div>
            <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: `1px solid ${border}`, flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: 'uppercase' }}>Ticket Médio</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{financeiro?.ticketMedio?.toLocaleString() || 0} MT</div>
            </div>
            <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: `1px solid ${border}`, flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: 'uppercase' }}>Total Pendente</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444', marginTop: 4 }}>{financeiro?.totalPendente?.toLocaleString() || 0} MT</div>
            </div>
            <div style={{ background: cardBg, borderRadius: 12, padding: 16, border: `1px solid ${border}`, flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: 'uppercase' }}>Novos Clientes</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#8B5CF6', marginTop: 4 }}>{resumo?.novosClientes || 0}</div>
            </div>
          </div>
          {/* ─── Gráficos ────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
            {/* ─── Gráfico: Faturamento diário ─────────────────────── */}
            <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}`, flex: 2, minWidth: 400 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 16 }}>Faturamento Diário</div>
              {financeiro?.evolucaoDiaria?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={financeiro.evolucaoDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#E2E8F0'} />
                    <XAxis dataKey="data" tick={{ fontSize: 10, fill: muted }} />
                    <YAxis tick={{ fontSize: 10, fill: muted }} />
                    <Tooltip contentStyle={{ background: darkMode ? '#1E293B' : '#fff', border: 'none', borderRadius: 8 }} />
                    <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 13 }}>Sem dados no período</div>
              )}
            </div>
            {/* ─── Gráfico: Métodos de pagamento ──────────────────── */}
            <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}`, flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 16 }}>Por Método de Pagamento</div>
              {financeiro?.porMetodo?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={financeiro.porMetodo} dataKey="total" nameKey="metodo" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ metodo }) => metodo}>
                      {financeiro.porMetodo.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 13 }}>Sem dados</div>
              )}
            </div>
          </div>
          {/* ─── Tabelas ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
            {/* ─── Tabela: Top 5 Serviços ──────────────────────────── */}
            <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}`, flex: 1, minWidth: 300 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 12 }}>Top 5 Serviços</div>
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: muted }}>Nome</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: muted }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: muted }}>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {servicos.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '6px 8px', color: text }}>{s.nome}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: text }}>{s.quantidade}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: text }}>{s.receita?.toLocaleString()} MT</td>
                    </tr>
                  ))}
                  {servicos.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: muted }}>Sem dados</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
            {/* ─── Tabela: Top 5 Clientes ──────────────────────────── */}
            <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}`, flex: 1, minWidth: 300 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 12 }}>Top 5 Clientes</div>
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: muted }}>Nome</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: muted }}>Pedidos</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: muted }}>Total Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '6px 8px', color: text }}>{c.nome}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: text }}>{c.total_pedidos}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: text }}>{c.total_gasto?.toLocaleString()} MT</td>
                    </tr>
                  ))}
                  {clientes.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: muted }}>Sem dados</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
          {/* ─── Tabela: Pedidos no Período ────────────────────────── */}
          <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: text }}>Pedidos no Período</div>
              <button onClick={exportarCSV} style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${border}`,
                background: '#2563EB', color: '#fff', cursor: pedidos.length > 0 ? 'pointer' : 'not-allowed', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: pedidos.length > 0 ? 1 : 0.5,
              }} disabled={pedidos.length === 0}>📥 Exportar Relatório</button>
            </div>
            <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted }}>Nº</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: muted }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: muted }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: text }}>{p.numero}</td>
                    <td style={{ padding: '8px 10px', color: text }}>{p.nome_cliente || p.cliente_nome || '-'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: (statusColors[p.status] || {}).bg,
                        color: (statusColors[p.status] || {}).text,
                      }}>{p.status?.replace('_', ' ')}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: text }}>{p.total?.toLocaleString()} MT</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: muted }}>{new Date(p.criado_em).toLocaleDateString()}</td>
                  </tr>
                ))}
                {pedidos.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: muted }}>Nenhum pedido no período</td></tr>
                )}
              </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
