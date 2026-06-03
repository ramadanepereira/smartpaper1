const express = require('express');
const db = require('../database');
const { logAtividade } = require('../logging');

const router = express.Router();

const STATUS_VALIDOS = ['pendente', 'em_andamento', 'concluido', 'entregue', 'cancelado'];

// --- Função auxiliar: gerar número do pedido ---
async function gerarNumeroPedido() {
  const ano = new Date().getFullYear();
  const ultimo = await db.get(
    "SELECT numero FROM pedidos WHERE numero LIKE ? ORDER BY id DESC LIMIT 1",
    [`REP-${ano}-%`]
  );
  let seq = 1;
  if (ultimo) {
    const partes = ultimo.numero.split('-');
    seq = parseInt(partes[2]) + 1;
  }
  return `REP-${ano}-${String(seq).padStart(4, '0')}`;
}

// --- GET / : Listar pedidos ---
router.get('/', async (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT p.*, c.nome as cliente_nome 
    FROM pedidos p 
    LEFT JOIN clientes c ON p.cliente_id = c.id 
    WHERE p.status != 'cancelado'`;
  const params = [];
  if (status) {
    const statusArr = Array.isArray(status) ? status : status.split(',');
    const placeholders = statusArr.map(() => '?').join(',');
    sql += ` AND p.status IN (${placeholders})`;
    params.push(...statusArr);
  }
  if (search) {
    sql += ' AND (p.numero LIKE ? OR p.nome_cliente LIKE ? OR c.nome LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY p.criado_em DESC';
  const pedidos = await db.all(sql, params);
  res.json(pedidos);
});

// --- GET /:id : Obter pedido por ID ---
router.get('/:id', async (req, res) => {
  const pedido = await db.get(`SELECT p.*, c.nome as cliente_nome 
    FROM pedidos p 
    LEFT JOIN clientes c ON p.cliente_id = c.id 
    WHERE p.id = ?`, [req.params.id]);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const itens = await db.all('SELECT * FROM pedido_itens WHERE pedido_id = ?', [req.params.id]);
  const pagamentos = await db.all('SELECT * FROM pagamentos WHERE pedido_id = ?', [req.params.id]);
  res.json({ ...pedido, itens, pagamentos });
});

// --- POST / : Criar pedido ---
router.post('/', async (req, res) => {
  const { cliente_id, nome_cliente, itens, observacoes } = req.body;
  if (!itens || itens.length === 0) {
    return res.status(400).json({ erro: 'Pedido deve ter pelo menos um item' });
  }
  const numero = await gerarNumeroPedido();
  let total = 0;
  for (const item of itens) {
    total += (item.quantidade || 1) * (item.preco_unit || 0);
  }
  const insertPedidoSQL = 'INSERT INTO pedidos (numero, cliente_id, nome_cliente, total, observacoes, criado_por) VALUES (?, ?, ?, ?, ?, ?)';
  const insertItemSQL = 'INSERT INTO pedido_itens (pedido_id, servico_id, nome, quantidade, preco_unit, subtotal) VALUES (?, ?, ?, ?, ?, ?)';
  const trx = db.transaction((cliente_id, nome_cliente, total, observacoes, criado_por) => {
    const result = db.run(insertPedidoSQL, [numero, cliente_id, nome_cliente, total, observacoes, criado_por]);
    const pedidoId = result.lastInsertRowid;
    for (const item of itens) {
      const subtotal = (item.quantidade || 1) * (item.preco_unit || 0);
      db.run(insertItemSQL, [pedidoId, item.servico_id || null, item.nome, item.quantidade || 1, item.preco_unit || 0, subtotal]);
    }
    return pedidoId;
  });
  const pedidoId = trx(cliente_id || null, nome_cliente || null, total, observacoes || null, req.utilizador.id);
  const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);

  logAtividade({
    tipo: 'criacao', entidade: 'pedido', entidade_id: pedidoId,
    descricao: `Pedido ${pedido.numero} foi criado (${total.toLocaleString()} MT)`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.status(201).json(pedido);
});

// --- PUT /:id/status : Atualizar status ---
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }
  const existing = await db.get('SELECT id FROM pedidos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado' });
  await db.run("UPDATE pedidos SET status = ?, atualizado_em = datetime('now','localtime') WHERE id = ?", [status, req.params.id]);
  const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);

  logAtividade({
    tipo: 'mudanca_status', entidade: 'pedido', entidade_id: pedido.id,
    descricao: `Pedido ${pedido.numero} mudou para "${status.replace('_', ' ')}"`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json(pedido);
});

// --- PUT /:id/observacoes : Atualizar observações ---
router.put('/:id/observacoes', async (req, res) => {
  const { observacoes } = req.body;
  const existing = await db.get('SELECT id FROM pedidos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const pedidoObs = await db.get('SELECT numero FROM pedidos WHERE id = ?', [req.params.id]);
  await db.run("UPDATE pedidos SET observacoes = ?, atualizado_em = datetime('now','localtime') WHERE id = ?", [observacoes || null, req.params.id]);

  logAtividade({
    tipo: 'atualizacao', entidade: 'pedido', entidade_id: req.params.id,
    descricao: `Observações do pedido ${pedidoObs.numero} foram actualizadas`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json({ mensagem: 'Observações atualizadas' });
});

// --- DELETE /:id : Cancelar pedido ---
router.delete('/:id', async (req, res) => {
  const existing = await db.get('SELECT id FROM pedidos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const pedidoDel = await db.get('SELECT numero FROM pedidos WHERE id = ?', [req.params.id]);
  await db.run("UPDATE pedidos SET status = 'cancelado', atualizado_em = datetime('now','localtime') WHERE id = ?", [req.params.id]);

  logAtividade({
    tipo: 'eliminacao', entidade: 'pedido', entidade_id: req.params.id,
    descricao: `Pedido ${pedidoDel.numero} foi cancelado`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json({ mensagem: 'Pedido cancelado com sucesso' });
});

module.exports = router;
