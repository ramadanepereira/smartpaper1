const express = require('express');
const db = require('../database');
const { logAtividade } = require('../logging');

const router = express.Router();

// ─── Listar todos os serviços (com filtros opcionais) ───
router.get('/', async (req, res) => {
  const { search, categoria } = req.query;
  let sql = 'SELECT * FROM servicos WHERE ativo = 1';
  const params = [];
  if (search) {
    sql += ' AND (nome LIKE ? OR descricao LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoria) {
    sql += ' AND categoria = ?';
    params.push(categoria);
  }
  sql += ' ORDER BY nome ASC';
  const servicos = await db.all(sql, params);
  res.json(servicos);
});

// ─── Obter um serviço por ID ───
router.get('/:id', async (req, res) => {
  const servico = await db.get('SELECT * FROM servicos WHERE id = ?', [req.params.id]);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });
  res.json(servico);
});

// ─── Criar um novo serviço ───
router.post('/', async (req, res) => {
  const { nome, descricao, preco, unidade, categoria } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
  const result = await db.run(
    'INSERT INTO servicos (nome, descricao, preco, unidade, categoria) VALUES (?, ?, ?, ?, ?)',
    [nome, descricao || null, parseFloat(preco), unidade || 'unidade', categoria || 'outro']
  );
  const servico = await db.get('SELECT * FROM servicos WHERE id = ?', [result.lastInsertRowid]);

  await logAtividade({
    tipo: 'criacao', entidade: 'servico', entidade_id: servico.id,
    descricao: `Serviço "${servico.nome}" foi criado (${Number(servico.preco).toLocaleString()} MT)`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.status(201).json(servico);
});

// ─── Atualizar um serviço existente ───
router.put('/:id', async (req, res) => {
  const { nome, descricao, preco, unidade, categoria } = req.body;
  const existing = await db.get('SELECT id FROM servicos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Serviço não encontrado' });
  const before = await db.get('SELECT nome FROM servicos WHERE id = ?', [req.params.id]);
  await db.run(
    'UPDATE servicos SET nome = ?, descricao = ?, preco = ?, unidade = ?, categoria = ? WHERE id = ?',
    [nome, descricao || null, parseFloat(preco), unidade || 'unidade', categoria || 'outro', req.params.id]
  );
  const servico = await db.get('SELECT * FROM servicos WHERE id = ?', [req.params.id]);

  await logAtividade({
    tipo: 'atualizacao', entidade: 'servico', entidade_id: servico.id,
    descricao: `Serviço "${before.nome}" foi actualizado`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json(servico);
});

// ─── Remover um serviço (soft delete) ───
router.delete('/:id', async (req, res) => {
  const existing = await db.get('SELECT id, nome FROM servicos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Serviço não encontrado' });
  await db.run('UPDATE servicos SET ativo = 0 WHERE id = ?', [req.params.id]);

  await logAtividade({
    tipo: 'eliminacao', entidade: 'servico', entidade_id: existing.id,
    descricao: `Serviço "${existing.nome}" foi removido`,
    utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
  });

  res.json({ mensagem: 'Serviço removido com sucesso' });
});

module.exports = router;
