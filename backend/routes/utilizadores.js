const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { logAtividade } = require('../logging');

const router = express.Router();

// GET / — Listar utilizadores com filtros opcionais
router.get('/', async (req, res) => {
  try {
    const { perfil, ativo } = req.query;
    let sql = 'SELECT id, nome, username, perfil, ativo, criado_em FROM utilizadores WHERE 1=1';
    const params = [];
    if (perfil) { sql += ' AND perfil = ?'; params.push(perfil); }
    if (ativo === '0' || ativo === '1') { sql += ' AND ativo = ?'; params.push(parseInt(ativo)); }
    sql += ' ORDER BY criado_em DESC';
    const utilizadores = await db.all(sql, params);
    res.json(utilizadores);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /:id — Obter um utilizador pelo ID
router.get('/:id', async (req, res) => {
  try {
    const u = await db.get('SELECT id, nome, username, perfil, ativo, criado_em FROM utilizadores WHERE id = ?', [req.params.id]);
    if (!u) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST / — Criar um novo utilizador
router.post('/', async (req, res) => {
  try {
    const { nome, username, password, perfil } = req.body;
    if (!nome || !username || !password) return res.status(400).json({ erro: 'Nome, username e password são obrigatórios' });
    const existente = await db.get('SELECT id FROM utilizadores WHERE username = ?', [username]);
    if (existente) return res.status(400).json({ erro: 'Username já está em uso' });
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO utilizadores (nome, username, password, perfil) VALUES (?, ?, ?, ?)', [nome, username, hash, perfil || 'operador']);
    const u = await db.get('SELECT id, nome, username, perfil, ativo, criado_em FROM utilizadores WHERE id = ?', [result.lastInsertRowid]);

    await logAtividade({
      tipo: 'criacao', entidade: 'utilizador', entidade_id: u.id,
      descricao: `Utilizador "${u.nome}" (${u.perfil}) foi criado`,
      utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
    });

    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PUT /:id — Atualizar um utilizador
router.put('/:id', async (req, res) => {
  try {
    const { nome, username, password, perfil } = req.body;
    const existing = await db.get('SELECT id FROM utilizadores WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    if (username) {
      const duplicado = await db.get('SELECT id FROM utilizadores WHERE username = ? AND id != ?', [username, req.params.id]);
      if (duplicado) return res.status(400).json({ erro: 'Username já está em uso' });
    }
    let sql = 'UPDATE utilizadores SET nome = ?, username = ?';
    const params = [nome, username];
    if (password) {
      sql += ', password = ?';
      params.push(await bcrypt.hash(password, 10));
    }
    if (perfil) {
      sql += ', perfil = ?';
      params.push(perfil);
    }
    sql += ' WHERE id = ?';
    params.push(req.params.id);
    await db.run(sql, params);
    const u = await db.get('SELECT id, nome, username, perfil, ativo, criado_em FROM utilizadores WHERE id = ?', [req.params.id]);

    await logAtividade({
      tipo: 'atualizacao', entidade: 'utilizador', entidade_id: u.id,
      descricao: `Utilizador "${u.nome}" foi actualizado`,
      utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
    });

    res.json(u);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PUT /:id/perfil — Alternar perfil entre admin/operador
router.put('/:id/perfil', async (req, res) => {
  try {
    const existing = await db.get('SELECT id, perfil FROM utilizadores WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    const novoPerfil = existing.perfil === 'admin' ? 'operador' : 'admin';
    await db.run('UPDATE utilizadores SET perfil = ? WHERE id = ?', [novoPerfil, req.params.id]);

    await logAtividade({
      tipo: 'atualizacao', entidade: 'utilizador', entidade_id: req.params.id,
      descricao: `Perfil do utilizador "${existing.nome}" alterado para ${novoPerfil}`,
      utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
    });

    res.json({ mensagem: 'Perfil alterado com sucesso', perfil: novoPerfil });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PUT /:id/ativo — Alternar estado ativo/inativo
router.put('/:id/ativo', async (req, res) => {
  try {
    const existing = await db.get('SELECT id, nome, ativo FROM utilizadores WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    const nomeUser = existing.nome;
    const novoAtivo = existing.ativo ? 0 : 1;
    await db.run('UPDATE utilizadores SET ativo = ? WHERE id = ?', [novoAtivo, req.params.id]);

    await logAtividade({
      tipo: 'atualizacao', entidade: 'utilizador', entidade_id: req.params.id,
      descricao: `Utilizador "${nomeUser}" foi ${novoAtivo ? 'activado' : 'desactivado'}`,
      utilizador_id: req.utilizador.id, utilizado_nome: req.utilizador.nome,
    });

    res.json({ mensagem: 'Estado alterado com sucesso', ativo: novoAtivo });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
