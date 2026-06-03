const express = require('express');
const db = require('../database');
const { logAtividade } = require('../logging');

const router = express.Router();

// ---- Rotas de Clientes ----

// Listar todos os clientes ativos
router.get('/', async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM clientes WHERE ativo = 1';
  const params = [];
  if (search) {
    sql += ' AND (nome LIKE ? OR telefone LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY criado_em DESC';
  const clientes = await db.all(sql, params);
  res.json(clientes);
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
  res.json(cliente);
});

// Criar novo cliente
router.post('/', async (req, res) => {
  const { nome, telefone, email, tipo, nuit, endereco, notas } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const result = await db.run(
    'INSERT INTO clientes (nome, telefone, email, tipo, nuit, endereco, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [nome, telefone || null, email || null, tipo || 'particular', nuit || null, endereco || null, notas || null]
  );
  const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [result.lastInsertRowid]);

  await logAtividade({
    tipo: 'criacao', entidade: 'cliente', entidade_id: cliente.id,
    descricao: `Cliente "${cliente.nome}" foi cadastrado`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.status(201).json(cliente);
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  const { nome, telefone, email, tipo, nuit, endereco, notas } = req.body;
  const existing = await db.get('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const before = await db.get('SELECT nome FROM clientes WHERE id = ?', [req.params.id]);
  await db.run(
    'UPDATE clientes SET nome = ?, telefone = ?, email = ?, tipo = ?, nuit = ?, endereco = ?, notas = ? WHERE id = ?',
    [nome || '', telefone || null, email || null, tipo || 'particular', nuit || null, endereco || null, notas || null, req.params.id]
  );
  const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id]);

  await logAtividade({
    tipo: 'atualizacao', entidade: 'cliente', entidade_id: cliente.id,
    descricao: `Dados do cliente "${before.nome}" foram actualizados`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json(cliente);
});

// Remover cliente (soft delete)
router.delete('/:id', async (req, res) => {
  const existing = await db.get('SELECT id, nome FROM clientes WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Cliente não encontrado' });
  await db.run('UPDATE clientes SET ativo = 0 WHERE id = ?', [req.params.id]);

  await logAtividade({
    tipo: 'eliminacao', entidade: 'cliente', entidade_id: existing.id,
    descricao: `Cliente "${existing.nome}" foi removido`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json({ mensagem: 'Cliente removido com sucesso' });
});

module.exports = router;
