const express = require('express');
const db = require('../database');
const { logAtividade } = require('../logging');

const router = express.Router();

router.get('/teste', async (req, res) => {
  try {
    logAtividade({
      tipo: 'teste', entidade: 'sistema', entidade_id: null,
      descricao: 'Teste de logging - endpoint de diagnóstico',
      utilizador_id: req.utilizador?.id, utilizado_nome: req.utilizador?.nome,
    });
    const rows = await db.all('SELECT COUNT(*) as total FROM atividades');
    res.json({ mensagem: 'Log de teste inserido', total: rows[0]?.total || 0 });
  } catch (err) {
    console.error('Erro no teste de logging:', err);
    res.status(500).json({ erro: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { limite, entidade, tipo } = req.query;
    let sql = 'SELECT * FROM atividades';
    const params = [];
    const wheres = [];
    if (entidade) { wheres.push('entidade = ?'); params.push(entidade); }
    if (tipo) { wheres.push('tipo = ?'); params.push(tipo); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY criado_em DESC';
    if (limite) { sql += ' LIMIT ?'; params.push(parseInt(limite)); }
    const atividades = await db.all(sql, params);
    res.json(atividades);
  } catch (err) {
    console.error('Erro ao listar atividades:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/entidades', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT entidade FROM atividades ORDER BY entidade');
    res.json(rows.map(r => r.entidade));
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
