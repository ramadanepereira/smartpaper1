const express = require('express');
const db = require('../database');
const { logAtividade } = require('../logging');

const router = express.Router();

// ---- Listar pagamentos ----
router.get('/', async (req, res) => {
  const { pedido_id, metodo } = req.query;
  let sql = `SELECT pa.*, p.numero as pedido_numero 
    FROM pagamentos pa 
    LEFT JOIN pedidos p ON pa.pedido_id = p.id 
    WHERE 1=1`;
  const params = [];
  if (pedido_id) {
    sql += ' AND pa.pedido_id = ?';
    params.push(pedido_id);
  }
  if (metodo) {
    sql += ' AND pa.metodo = ?';
    params.push(metodo);
  }
  sql += ' ORDER BY pa.criado_em DESC';
  const pagamentos = await db.all(sql, params);
  res.json(pagamentos);
});

// ---- Resumo do dia ----
router.get('/resumo/hoje', async (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const total = await db.get(
    "SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE date(criado_em) = ?",
    [hoje]
  );
  const porMetodo = await db.all(
    "SELECT metodo, COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE date(criado_em) = ? GROUP BY metodo",
    [hoje]
  );
  res.json({ total: total.total, porMetodo });
});

// ---- Buscar pagamento por ID ----
router.get('/:id', async (req, res) => {
  const pagamento = await db.get('SELECT * FROM pagamentos WHERE id = ?', [req.params.id]);
  if (!pagamento) return res.status(404).json({ erro: 'Pagamento não encontrado' });
  res.json(pagamento);
});

// ---- Criar pagamento ----
router.post('/', async (req, res) => {
  const { pedido_id, valor, metodo, referencia, notas } = req.body;
  if (!pedido_id || valor === undefined || !metodo) {
    return res.status(400).json({ erro: 'Pedido, valor e método são obrigatórios' });
  }
  const pedido = await db.get('SELECT id, total FROM pedidos WHERE id = ?', [pedido_id]);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const result = await db.run(
    'INSERT INTO pagamentos (pedido_id, valor, metodo, referencia, notas, criado_por) VALUES (?, ?, ?, ?, ?, ?)',
    [pedido_id, parseFloat(valor), metodo, referencia || null, notas || null, req.utilizador.id]
  );
  const somaPagamentos = await db.get(
    'SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE pedido_id = ?',
    [pedido_id]
  );
  if (somaPagamentos.total >= pedido.total) {
    await db.run(
      "UPDATE pedidos SET status = 'concluido', atualizado_em = datetime('now','localtime') WHERE id = ?",
      [pedido_id]
    );
  }
  const pagamento = await db.get('SELECT * FROM pagamentos WHERE id = ?', [result.lastInsertRowid]);
  const pedidoPag = await db.get('SELECT numero FROM pedidos WHERE id = ?', [pedido_id]);

  await logAtividade({
    tipo: 'criacao', entidade: 'pagamento', entidade_id: pagamento.id,
    descricao: `Pagamento de ${parseFloat(valor).toLocaleString()} MT (${metodo}) registado para o pedido ${pedidoPag.numero}`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.status(201).json(pagamento);
});

module.exports = router;
