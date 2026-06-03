/* ── Ficheiro principal do servidor SmartPaper API ── */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

/* ── Importação das rotas ── */
const { authMiddleware, adminOnly } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const utilizadoresRoutes = require('./routes/utilizadores');
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const pedidosRoutes = require('./routes/pedidos');
const pagamentosRoutes = require('./routes/pagamentos');
const tarefasRoutes = require('./routes/tarefas');
const relatoriosRoutes = require('./routes/relatorios');
const atividadesRoutes = require('./routes/atividades');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

/* ── Inicialização da base de dados (apenas PostgreSQL, SQLite faz no import) ── */
async function inicializarBD() {
  if (!process.env.DATABASE_URL) return;
  try {
    /* Cria tabelas se não existirem */
    await db.run(`
      CREATE TABLE IF NOT EXISTS utilizadores (
        id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL, perfil VARCHAR(20) NOT NULL DEFAULT 'operador',
        ativo INTEGER NOT NULL DEFAULT 1, criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, telefone VARCHAR(50),
        email VARCHAR(255), tipo VARCHAR(20) NOT NULL DEFAULT 'particular',
        nuit VARCHAR(50), endereco TEXT, notas TEXT, ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, descricao TEXT,
        preco NUMERIC(10,2) NOT NULL, unidade VARCHAR(20) NOT NULL DEFAULT 'unidade',
        categoria VARCHAR(20) NOT NULL DEFAULT 'outro', ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY, numero VARCHAR(50) NOT NULL UNIQUE,
        cliente_id INTEGER REFERENCES clientes(id), nome_cliente VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pendente',
        total NUMERIC(10,2) NOT NULL DEFAULT 0, observacoes TEXT,
        criado_por INTEGER REFERENCES utilizadores(id),
        criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS pedido_itens (
        id SERIAL PRIMARY KEY, pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
        servico_id INTEGER REFERENCES servicos(id), nome VARCHAR(255) NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1, preco_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
        subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY, pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
        valor NUMERIC(10,2) NOT NULL, metodo VARCHAR(20) NOT NULL,
        referencia VARCHAR(255), notas TEXT, criado_por INTEGER REFERENCES utilizadores(id),
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS tarefas (
        id SERIAL PRIMARY KEY, titulo VARCHAR(255) NOT NULL, descricao TEXT,
        prazo TIMESTAMP, concluida INTEGER NOT NULL DEFAULT 0,
        criado_por INTEGER REFERENCES utilizadores(id),
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS atividades (
        id SERIAL PRIMARY KEY, tipo VARCHAR(50) NOT NULL,
        entidade VARCHAR(50) NOT NULL, entidade_id INTEGER,
        descricao TEXT NOT NULL,
        utilizador_id INTEGER REFERENCES utilizadores(id),
        utilizado_nome VARCHAR(255),
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    /* Seed: admin user */
    const admin = await db.get('SELECT id FROM utilizadores WHERE username = ?', ['admin']);
    if (!admin) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await db.run(
        'INSERT INTO utilizadores (nome, username, password, perfil) VALUES (?, ?, ?, ?)',
        ['Administrador', 'admin', hash, 'admin']
      );
    }

    /* Seed: servicos */
    const servCount = await db.get('SELECT COUNT(*) as count FROM servicos');
    if (parseInt(servCount.count) === 0) {
      const servicos = [
        ['Impressão A4 P&B', 'Impressão A4 preto e branco', 5.00, 'pagina', 'impressao'],
        ['Impressão A4 Colorida', 'Impressão A4 colorida', 15.00, 'pagina', 'impressao'],
        ['Impressão A3 P&B', 'Impressão A3 preto e branco', 10.00, 'pagina', 'impressao'],
        ['Impressão A3 Colorida', 'Impressão A3 colorida', 25.00, 'pagina', 'impressao'],
        ['Fotocópia A4', 'Fotocópia simples A4', 3.00, 'pagina', 'copia'],
        ['Fotocópia A3', 'Fotocópia simples A3', 6.00, 'pagina', 'copia'],
        ['Plastificação A4', 'Plastificação de documentos A4', 50.00, 'unidade', 'acabamento'],
        ['Plastificação A3', 'Plastificação de documentos A3', 80.00, 'unidade', 'acabamento'],
        ['Encadernação', 'Encadernação de documentos', 120.00, 'unidade', 'acabamento'],
        ['Digitalização', 'Digitalização por página', 5.00, 'pagina', 'outro'],
      ];
      for (const s of servicos) {
        await db.run('INSERT INTO servicos (nome, descricao, preco, unidade, categoria) VALUES (?, ?, ?, ?, ?)', s);
      }
    }
    console.log('Base de dados PostgreSQL inicializada com sucesso');
  } catch (err) {
    console.error('Erro ao inicializar base de dados:', err);
  }
}

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sistema: 'SmartPaper API', versao: '1.0.0', hora: new Date().toISOString() });
});

/* ── Diagnóstico rápido de logging (público) ── */
app.get('/api/diag-log', async (req, res) => {
  try {
    const d = require('./database');
    const { logAtividade: log } = require('./logging');
    await log({
      tipo: 'teste', entidade: 'sistema', entidade_id: 0,
      descricao: `Teste diagnóstico - ${new Date().toISOString()}`,
      utilizador_id: 0, utilizado_nome: 'Diagnóstico',
    });
    const total = d.all('SELECT COUNT(*) as total FROM atividades');
    const ultimas = d.all('SELECT * FROM atividades ORDER BY criado_em DESC LIMIT 3');
    res.json({
      status: 'ok',
      totalAtividades: total[0]?.total || 0,
      ultimosRegistos: ultimas.map(a => ({ tipo: a.tipo, entidade: a.entidade, descricao: a.descricao, criado_em: a.criado_em })),
    });
  } catch (err) {
    res.status(500).json({ erro: err.message, stack: err.stack });
  }
});

/* ── Rotas públicas ── */
app.use('/api/auth', authRoutes);

/* ── Rotas protegidas ── */
app.use('/api/utilizadores', authMiddleware, adminOnly, utilizadoresRoutes);
app.use('/api/clientes', authMiddleware, clientesRoutes);
app.use('/api/servicos', authMiddleware, servicosRoutes);
app.use('/api/pedidos', authMiddleware, pedidosRoutes);
app.use('/api/pagamentos', authMiddleware, pagamentosRoutes);
app.use('/api/tarefas', authMiddleware, tarefasRoutes);
app.use('/api/relatorios', authMiddleware, relatoriosRoutes);
app.use('/api/atividades', authMiddleware, atividadesRoutes);

/* ── Handler para rotas não encontradas ── */
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

/* ── Handler global de erros ── */
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

/* ── Inicialização assíncrona e start do servidor ── */
inicializarBD().then(() => {
  app.listen(PORT, () => {
    console.log(`SmartPaper API rodando na porta ${PORT}`);
    if (process.env.DATABASE_URL) console.log('Modo: PostgreSQL');
    else console.log('Modo: SQLite (desenvolvimento local)');
  });
});
