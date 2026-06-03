// ============================================================================
// Rotas de Autenticação (Auth Routes)
// ============================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { logAtividade } = require('../logging');

const router = express.Router();

// ----------------------------------------------------------------------------
// POST /login — Autenticação de utilizador
// ----------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ erro: 'Username e password são obrigatórios' });
    }

    const utilizador = await db.get(
      'SELECT * FROM utilizadores WHERE username = ? AND ativo = 1',
      [username]
    );
    if (!utilizador) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(password, utilizador.password);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: utilizador.id, username: utilizador.username, perfil: utilizador.perfil, nome: utilizador.nome },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logAtividade({
      tipo: 'login', entidade: 'utilizador', entidade_id: utilizador.id,
      descricao: `Login realizado por ${utilizador.nome} (${utilizador.perfil})`,
      utilizador_id: utilizador.id, utilizado_nome: utilizador.nome,
    });

    res.json({
      token,
      utilizador: {
        id: utilizador.id,
        nome: utilizador.nome,
        username: utilizador.username,
        perfil: utilizador.perfil,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ----------------------------------------------------------------------------
// GET /me — Dados do utilizador autenticado
// ----------------------------------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const utilizador = await db.get(
      'SELECT id, nome, username, perfil, ativo, criado_em FROM utilizadores WHERE id = ?',
      [req.utilizador.id]
    );
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }
    res.json(utilizador);
  } catch (err) {
    console.error('Erro ao obter utilizador:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
