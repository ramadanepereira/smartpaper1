const express = require('express');
const db = require('../database');

const router = express.Router();

// ---- Listar tarefas (com filtro opcional por concluída) ----
router.get('/', async (req, res) => {
  try {
    const { concluida } = req.query;
    let sql = 'SELECT * FROM tarefas WHERE 1=1';
    const params = [];
    if (concluida === '0' || concluida === '1') {
      sql += ' AND concluida = ?';
      params.push(parseInt(concluida));
    }
    sql += ' ORDER BY criado_em DESC';
    const tarefas = await db.all(sql, params);
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ---- Criar tarefa ----
router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, prazo } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório' });
    const result = await db.run(
      'INSERT INTO tarefas (titulo, descricao, prazo, criado_por) VALUES (?, ?, ?, ?)',
      [titulo, descricao || null, prazo || null, req.utilizador.id]
    );
    const tarefa = await db.get('SELECT * FROM tarefas WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ---- Atualizar tarefa ----
router.put('/:id', async (req, res) => {
  try {
    const { titulo, descricao, prazo } = req.body;
    const existing = await db.get('SELECT id FROM tarefas WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    await db.run(
      'UPDATE tarefas SET titulo = ?, descricao = ?, prazo = ? WHERE id = ?',
      [titulo, descricao || null, prazo || null, req.params.id]
    );
    const tarefa = await db.get('SELECT * FROM tarefas WHERE id = ?', [req.params.id]);
    res.json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ---- Concluir / reabrir tarefa ----
router.put('/:id/concluir', async (req, res) => {
  try {
    const existing = await db.get('SELECT id, concluida FROM tarefas WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    await db.run(
      'UPDATE tarefas SET concluida = ? WHERE id = ?',
      [existing.concluida ? 0 : 1, req.params.id]
    );
    const tarefa = await db.get('SELECT * FROM tarefas WHERE id = ?', [req.params.id]);
    res.json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ---- Remover tarefa ----
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM tarefas WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    await db.run('DELETE FROM tarefas WHERE id = ?', [req.params.id]);
    res.json({ mensagem: 'Tarefa removida com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
