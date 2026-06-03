import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';

const statusCores = {
  pendente: { bg: '#FEF3C7', color: '#92400E', label: 'Pendente' },
  em_andamento: { bg: '#DBEAFE', color: '#1E40AF', label: 'Em Andamento' },
  concluido: { bg: '#D1FAE5', color: '#065F46', label: 'Concluído' },
  entregue: { bg: '#EDE9FE', color: '#4C1D95', label: 'Entregue' },
  cancelado: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado' },
};

const faturamentoMock = [
  { dia: '01 Mai', valor: 2100 }, { dia: '03 Mai', valor: 3400 },
  { dia: '05 Mai', valor: 2800 }, { dia: '07 Mai', valor: 5200 },
  { dia: '09 Mai', valor: 4100 }, { dia: '11 Mai', valor: 6800 },
  { dia: '13 Mai', valor: 9200 }, { dia: '15 Mai', valor: 15450 },
  { dia: '17 Mai', valor: 11200 }, { dia: '19 Mai', valor: 13800 },
  { dia: '21 Mai', valor: 19400 }, { dia: '23 Mai', valor: 16700 },
  { dia: '25 Mai', valor: 21300 }, { dia: '27 Mai', valor: 18900 },
  { dia: '30 Mai', valor: 12400 },
];

const tarefasMock = [
  { texto: 'Entregar pedido #REP-2026-0024', prazo: 'Hoje, 14:00' },
  { texto: 'Fazer manutenção impressora', prazo: 'Amanhã, 09:00' },
  { texto: 'Atualizar preços dos serviços', prazo: '27/05/2026' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1E293B', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
        <div style={{ marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#60A5FA', fontWeight: 600 }}>{Number(payload[0].value).toLocaleString('pt-MZ')} MT</div>
      </div>
    );
  }
  return null;
};

/* ── Dashboard ──
 * Página inicial pós-login com visão geral do negócio:
 * - 4 KPIs (clientes, pedidos hoje, faturamento, pendentes)
 * - Gráfico de linha: evolução do faturamento (mock)
 * - Gráfico donut: distribuição de status dos pedidos
 * - Tabela: últimos 5 pedidos
 * - Progress bars: serviços mais solicitados (mock)
 * - Painel lateral: data, novo pedido, resumo financeiro, tarefas, atalhos
 * Dados mock (faturamentoMock, tarefasMock) — substituir por API real. */
export default function Dashboard() {
  const { utilizador, darkMode, API } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  /* ── KPIs calculados a partir das APIs ── */
  const [stats, setStats] = useState({ clientes: 0, pedidosHoje: 0, faturamentoHoje: 0, pendentes: 0 });
  const [pedidos, setPedidos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [pedidosStatus, setPedidosStatus] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date().toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' });

  /* ── Carrega dados ao montar o componente ── */
  useEffect(() => {
    carregarDados();
  }, []);

  /* ── Busca clientes, pedidos e serviços em paralelo e calcula KPIs ──
   * Faturamento do dia = soma dos totais dos pedidos criados hoje.
   * Serviços mais solicitados são mock — substituir por endpoint futuro. */
  async function carregarDados() {
    try {
      const [clientesRes, pedidosRes, servicosRes] = await Promise.all([
        axios.get(`${API}/clientes`),
        axios.get(`${API}/pedidos`),
        axios.get(`${API}/servicos`),
      ]);

      const todosPedidos = pedidosRes.data;
      const todosClientes = clientesRes.data;

      const hojeStr = new Date().toISOString().split('T')[0];
      const pedidosHoje = todosPedidos.filter(p => p.criado_em?.startsWith(hojeStr));
      const faturamentoHoje = pedidosHoje.reduce((s, p) => s + (p.total || 0), 0);
      const pendentes = todosPedidos.filter(p => p.status === 'pendente').length;

      setStats({
        clientes: todosClientes.length,
        pedidosHoje: pedidosHoje.length,
        faturamentoHoje,
        pendentes,
      });

      setPedidos(todosPedidos.slice(0, 5));

      const statusCount = { pendente: 0, em_andamento: 0, concluido: 0, entregue: 0 };
      todosPedidos.forEach(p => { if (statusCount[p.status] !== undefined) statusCount[p.status]++; });
      const total = todosPedidos.length || 1;
      setPedidosStatus([
        { name: 'Pendentes', value: statusCount.pendente, pct: Math.round(statusCount.pendente / total * 100), color: '#3B82F6' },
        { name: 'Em Andamento', value: statusCount.em_andamento, pct: Math.round(statusCount.em_andamento / total * 100), color: '#10B981' },
        { name: 'Concluídos', value: statusCount.concluido, pct: Math.round(statusCount.concluido / total * 100), color: '#F59E0B' },
        { name: 'Entregues', value: statusCount.entregue, pct: Math.round(statusCount.entregue / total * 100), color: '#8B5CF6' },
      ]);

      setServicos([
        { nome: 'Impressão Preto e Branco', count: 132 },
        { nome: 'Fotocópia', count: 98 },
        { nome: 'Encadernação', count: 76 },
        { nome: 'Plastificação', count: 54 },
        { nome: 'Impressão Colorida', count: 45 },
      ]);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setCarregando(false);
    }
  }

  const border = darkMode ? '#334155' : '#E2E8F0';
  const card = darkMode ? '#1E293B' : '#fff';
  const text = darkMode ? '#F1F5F9' : '#1E293B';
  const muted = darkMode ? '#94A3B8' : '#64748B';

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: muted, fontSize: 14 }}>
      A carregar dashboard...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, minHeight: '100%', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0, textAlign: 'left' }}>
              Bem-vindo, {utilizador?.nome || 'Administrador'}! 🎯
            </h1>
            <p style={{ color: muted, fontSize: 13, marginTop: 4, textAlign: 'left' }}>Aqui está o resumo do seu negócio hoje.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
          {[
            { icon: '👥', label: 'Clientes Cadastrados', value: stats.clientes, sub: 'Total de clientes', bg: '#DBEAFE', click: '/clientes' },
            { icon: '🛒', label: 'Pedidos Hoje', value: stats.pedidosHoje, sub: 'Recebidos hoje', bg: '#D1FAE5', click: '/pedidos' },
            { icon: '💵', label: 'Faturamento Hoje', value: `${stats.faturamentoHoje.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, sub: 'Valor total do dia', bg: '#FEF3C7', click: '/pagamentos' },
            { icon: '📋', label: 'Pedidos Pendentes', value: stats.pendentes, sub: 'Aguardando processamento', bg: '#EDE9FE', click: '/pedidos' },
          ].map(kpi => (
            <div key={kpi.label} onClick={() => navigate(kpi.click)} style={{
              background: card, border: `1px solid ${border}`, borderRadius: 12,
              padding: '14px 16px', cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: kpi.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0
                }}>{kpi.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: text, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ color: '#10B981', fontSize: 11, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: text, fontSize: 14 }}>Resumo de Faturamento</div>
              <select style={{
                background: darkMode ? '#0F172A' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: 6,
                padding: '4px 10px', fontSize: 12, color: muted, cursor: 'pointer', outline: 'none'
              }}>
                <option>Este mês</option>
                <option>Mês passado</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={faturamentoMock} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#F1F5F9'} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: muted }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: muted }} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontWeight: 600, color: text, fontSize: 14, marginBottom: 12 }}>Pedidos por Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0 }}>
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={pedidosStatus.some(s => s.value > 0) ? pedidosStatus : [{ name: 'Sem dados', value: 1, color: '#dbd1d1' }]}
                      cx="50%" cy="50%" innerRadius={33} outerRadius={55}
                      dataKey="value" paddingAngle={pedidosStatus.some(s => s.value > 0) ? 3 : 0}
                    >
                      {(pedidosStatus.some(s => s.value > 0) ? pedidosStatus : [{ color: '#E2E8F0' }]).map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pedidosStatus.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div style={{ color: text, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ color: muted, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {s.value} ({s.pct}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: text, fontSize: 14, marginBottom: 14 }}>Últimos Pedidos</div>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Nº', 'Cliente', 'Data', 'Total', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 500, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: muted }}>Nenhum pedido ainda</td></tr>
                ) : pedidos.map(p => {
                  const sc = statusCores[p.status] || { bg: '#F1F5F9', color: '#64748B', label: p.status };
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '9px 8px', color: '#3B82F6', fontWeight: 600 }}>{p.numero}</td>
                      <td style={{ padding: '9px 8px', color: text }}>{p.nome_cliente || p.cliente_nome || '—'}</td>
                      <td style={{ padding: '9px 8px', color: muted }}>{new Date(p.criado_em).toLocaleDateString('pt-MZ')}</td>
                      <td style={{ padding: '9px 8px', color: text, fontWeight: 600 }}>{Number(p.total).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                      <td style={{ padding: '9px 8px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{sc.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => navigate('/pedidos')} style={{
              background: 'none', border: `1px solid ${border}`, color: '#3B82F6',
              borderRadius: 8, padding: '7px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 500
            }}>Ver todos os pedidos →</button>
          </div>
        </div>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: text, fontSize: 14, marginBottom: 14 }}>Serviços Mais Solicitados</div>
          {servicos.map(s => (
            <div key={s.nome} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: text, fontSize: 12 }}>{s.nome}</span>
                <span style={{ color: muted, fontSize: 12 }}>{s.count}</span>
              </div>
              <div style={{ height: 6, background: darkMode ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(s.count / 132) * 100}%`, background: '#3B82F6', borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button onClick={() => navigate('/servicos')} style={{
              background: 'none', border: `1px solid ${border}`, color: '#3B82F6',
              borderRadius: 8, padding: '7px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 500
            }}>Ver todos os serviços →</button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: muted, paddingBottom: 16 }}>
          © 2026 SmartPaper - Gestão Inteligente de Impressão e Papelaria. Todos os direitos reservados.
          <span style={{ float: 'right' }}>Versão 1.0.0</span>
        </div>
      </div>

      <div style={{ width: isMobile ? '100%' : 220, flexShrink: 0, alignSelf: 'flex-start', position: isMobile ? 'static' : 'sticky', top: 0 }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📅</span>
          <span style={{ color: text, fontSize: 13, fontWeight: 500 }}>{hoje}</span>
        </div>

        <button onClick={() => navigate('/pedidos')} style={{
          width: '100%', background: '#3B82F6', color: '#fff', border: 'none',
          borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', marginBottom: 16
        }}>+ Novo Pedido</button>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, color: text, fontSize: 13, marginBottom: 12 }}>Resumo Financeiro</div>
          {[
            { label: 'Faturamento Hoje', value: `${stats.faturamentoHoje.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, pos: true },
            { label: 'Faturamento Mês', value: '278.650,00 MT', pos: true },
            { label: 'Despesas Mês', value: '45.320,00 MT', pos: false },
            { label: 'Lucro Líquido', value: '233.330,00 MT', pos: true },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 10 }}>
              <div style={{ color: muted, fontSize: 11, marginBottom: 2 }}>{r.label}</div>
              <div style={{ color: r.pos ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: 13 }}>{r.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, color: text, fontSize: 13, marginBottom: 12 }}>Tarefas Pendentes</div>
          {tarefasMock.map(t => (
            <div key={t.texto} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${border}`, flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ color: text, fontSize: 11, lineHeight: 1.4 }}>{t.texto}</div>
                <div style={{ color: muted, fontSize: 10, marginTop: 2 }}>{t.prazo}</div>
              </div>
            </div>
          ))}
          <button style={{ width: '100%', background: 'none', border: `1px solid ${border}`, color: '#3B82F6', borderRadius: 7, padding: 6, fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
            Ver todas as tarefas
          </button>
        </div>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontWeight: 600, color: text, fontSize: 13, marginBottom: 12 }}>Atalhos Rápidos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '👥', label: 'Novo Cliente', bg: '#DBEAFE', path: '/clientes' },
              { icon: '🖨️', label: 'Novo Serviço', bg: '#D1FAE5', path: '/servicos' },
              { icon: '📊', label: 'Relatórios', bg: '#FEF3C7', path: '/relatorios' },
              { icon: '🧾', label: 'Recibos (PDF)', bg: '#FEE2E2', path: '/relatorios' },
            ].map(a => (
              <div key={a.label} onClick={() => navigate(a.path)} style={{
                background: darkMode ? '#0F172A' : '#F8FAFC',
                border: `1px solid ${border}`, borderRadius: 8,
                padding: '10px 8px', textAlign: 'center', cursor: 'pointer'
              }}>
                <div style={{ width: 32, height: 32, background: a.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, margin: '0 auto 6px' }}>{a.icon}</div>
                <div style={{ color: text, fontSize: 10, fontWeight: 500 }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
