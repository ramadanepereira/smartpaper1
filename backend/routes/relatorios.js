const express = require('express');
const db = require('../database');

const router = express.Router();

function getPeriodo(inicio, fim) {
  const f = fim || new Date().toISOString().split('T')[0];
  const i = inicio || f;
  return { inicio: i, fim: f };
}

// Relatório financeiro
router.get('/financeiro', async (req, res) => {
  try {
    const { inicio, fim } = getPeriodo(req.query.inicio, req.query.fim);
    const totalFaturado = await db.get(
      "SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE date(criado_em) BETWEEN ? AND ?",
      [inicio, fim]
    );
    const porMetodo = await db.all(
      "SELECT metodo, COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE date(criado_em) BETWEEN ? AND ? GROUP BY metodo",
      [inicio, fim]
    );
    const pedidosComPagamento = await db.get(
      "SELECT COUNT(DISTINCT pedido_id) as total FROM pagamentos WHERE date(criado_em) BETWEEN ? AND ?",
      [inicio, fim]
    );
    const ticketMedio = pedidosComPagamento.total > 0
      ? totalFaturado.total / pedidosComPagamento.total : 0;
    const evolucaoDiaria = await db.all(
      "SELECT date(criado_em) as data, COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE date(criado_em) BETWEEN ? AND ? GROUP BY date(criado_em) ORDER BY data",
      [inicio, fim]
    );
    const totalPendente = await db.get(
      "SELECT COALESCE(SUM(total - COALESCE((SELECT SUM(valor) FROM pagamentos WHERE pedido_id = p.id), 0)), 0) as total FROM pedidos p WHERE p.status NOT IN ('cancelado','entregue')"
    );
    res.json({
      totalFaturado: totalFaturado.total,
      porMetodo,
      ticketMedio,
      evolucaoDiaria,
      totalPendente: totalPendente.total,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Serviços mais populares
router.get('/servicos-populares', async (req, res) => {
  try {
    const { inicio, fim } = getPeriodo(req.query.inicio, req.query.fim);
    const topServicos = await db.all(
      `SELECT s.nome, s.categoria, COUNT(pi.id) as quantidade, COALESCE(SUM(pi.subtotal), 0) as receita
       FROM pedido_itens pi
       JOIN servicos s ON pi.servico_id = s.id
       JOIN pedidos p ON pi.pedido_id = p.id
       WHERE date(p.criado_em) BETWEEN ? AND ? AND p.status != 'cancelado'
       GROUP BY pi.servico_id ORDER BY quantidade DESC LIMIT 10`,
      [inicio, fim]
    );
    res.json(topServicos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Clientes que mais gastam
router.get('/clientes-top', async (req, res) => {
  try {
    const { inicio, fim } = getPeriodo(req.query.inicio, req.query.fim);
    const topClientes = await db.all(
      `SELECT c.id, c.nome, c.telefone, COUNT(DISTINCT p.id) as total_pedidos, COALESCE(SUM(pa.valor), 0) as total_gasto
       FROM clientes c
       JOIN pedidos p ON c.id = p.cliente_id
       LEFT JOIN pagamentos pa ON p.id = pa.pedido_id
       WHERE date(p.criado_em) BETWEEN ? AND ? AND p.status != 'cancelado'
       GROUP BY c.id ORDER BY total_gasto DESC LIMIT 10`,
      [inicio, fim]
    );
    res.json(topClientes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Resumo geral do período
router.get('/resumo-geral', async (req, res) => {
  try {
    const { inicio, fim } = getPeriodo(req.query.inicio, req.query.fim);
    const pedidosPorStatus = await db.all(
      "SELECT status, COUNT(*) as total FROM pedidos WHERE date(criado_em) BETWEEN ? AND ? GROUP BY status",
      [inicio, fim]
    );
    const totalFaturado = await db.get(
      "SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE date(criado_em) BETWEEN ? AND ?",
      [inicio, fim]
    );
    const totalPendente = await db.all(
      "SELECT COALESCE(SUM(total), 0) as total FROM pedidos WHERE status IN ('pendente','em_andamento') AND date(criado_em) BETWEEN ? AND ?",
      [inicio, fim]
    );
    const novosClientes = await db.get(
      "SELECT COUNT(*) as total FROM clientes WHERE date(criado_em) BETWEEN ? AND ?",
      [inicio, fim]
    );
    res.json({
      pedidosPorStatus,
      totalFaturado: totalFaturado.total,
      totalPendente: totalPendente.length > 0 ? totalPendente[0].total : 0,
      novosClientes: novosClientes.total,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
