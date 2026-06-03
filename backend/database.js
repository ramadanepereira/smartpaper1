/* ── Módulo de base de dados unificado (SQLite + PostgreSQL) ── */
/* Suporta ambos os drivers conforme a presença de DATABASE_URL no .env */

const path = require('path');

let db;

if (process.env.DATABASE_URL) {
  /* ── Modo PostgreSQL (produção) ── */
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  /* Converte SQL de SQLite para PostgreSQL:
   * - Placeholders ? → $1, $2, ...
   * - datetime('now','localtime') → NOW()
   */
  function convertParams(sql, params) {
    let idx = 0;
    let converted = sql
      .replace(/\?/g, () => `$${++idx}`)
      .replace(/datetime\('now','localtime'\)/gi, "NOW()");
    return { sql: converted, params: params || [] };
  }

  db = {
    /* Retorna array de linhas */
    all: async (sql, params) => {
      const q = convertParams(sql, params);
      const r = await pool.query(q.sql, q.params);
      return r.rows;
    },
    /* Retorna uma única linha ou undefined */
    get: async (sql, params) => {
      const q = convertParams(sql, params);
      const r = await pool.query(q.sql, q.params);
      return r.rows[0];
    },
    /* Executa e retorna resultado (último ID inserido para INSERT) */
    run: async (sql, params) => {
      const isInsert = /^\s*INSERT\s/i.test(sql);
      const finalSql = isInsert ? sql + ' RETURNING id' : sql;
      const q = convertParams(finalSql, params);
      const r = await pool.query(q.sql, q.params);
      return { lastInsertRowid: r.rows[0]?.id ?? null, changes: r.rowCount };
    },
    /* Para transacções */
    transaction: (fn) => async (...args) => {
      await pool.query('BEGIN');
      try {
        const result = await fn(...args);
        await pool.query('COMMIT');
        return result;
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
    },
    /* Fecha a conexão */
    close: () => pool.end(),
  };
} else {
  /* ── Modo SQLite (desenvolvimento local) ── */
  const Database = require('better-sqlite3');
  const sqlite = new Database(path.join(__dirname, 'smartpaper.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  /* Criação das tabelas */
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS utilizadores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'operador' CHECK(perfil IN ('admin','operador')), ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT, email TEXT, tipo TEXT NOT NULL DEFAULT 'particular' CHECK(tipo IN ('particular','empresa')), nuit TEXT, endereco TEXT, notas TEXT, ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS servicos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT, preco REAL NOT NULL, unidade TEXT NOT NULL DEFAULT 'unidade' CHECK(unidade IN ('unidade','pagina','folha')), categoria TEXT NOT NULL DEFAULT 'outro' CHECK(categoria IN ('impressao','copia','acabamento','outro')), ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE, cliente_id INTEGER REFERENCES clientes(id), nome_cliente TEXT, status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','concluido','entregue','cancelado')), total REAL NOT NULL DEFAULT 0, observacoes TEXT, criado_por INTEGER REFERENCES utilizadores(id), criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS pedido_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE, servico_id INTEGER REFERENCES servicos(id), nome TEXT NOT NULL, quantidade INTEGER NOT NULL DEFAULT 1, preco_unit REAL NOT NULL DEFAULT 0, subtotal REAL NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS pagamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL REFERENCES pedidos(id), valor REAL NOT NULL, metodo TEXT NOT NULL CHECK(metodo IN ('dinheiro','mpesa','emola','cartao')), referencia TEXT, notas TEXT, criado_por INTEGER REFERENCES utilizadores(id), criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, descricao TEXT, prazo TEXT, concluida INTEGER NOT NULL DEFAULT 0, criado_por INTEGER REFERENCES utilizadores(id), criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS atividades (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, entidade TEXT NOT NULL, entidade_id INTEGER, descricao TEXT NOT NULL, utilizador_id INTEGER REFERENCES utilizadores(id), utilizado_nome TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
  `);

  /* Seed: admin user */
  const adminExists = sqlite.prepare('SELECT COUNT(*) as count FROM utilizadores WHERE username = ?').get('admin');
  if (adminExists.count === 0) {
    const bcrypt = require('bcryptjs');
    sqlite.prepare('INSERT INTO utilizadores (nome, username, password, perfil) VALUES (?, ?, ?, ?)').run('Administrador', 'admin', bcrypt.hashSync('admin123', 10), 'admin');
  }

  /* Seed: serviços */
  const servicosCount = sqlite.prepare('SELECT COUNT(*) as count FROM servicos').get();
  if (servicosCount.count === 0) {
    const insert = sqlite.prepare('INSERT INTO servicos (nome, descricao, preco, unidade, categoria) VALUES (?, ?, ?, ?, ?)');
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
    const insertMany = sqlite.transaction((items) => { for (const s of items) insert.run(...s); });
    insertMany(servicos);
  }

  db = {
    all: (sql, params) => { try { return sqlite.prepare(sql).all(...(params || [])); } catch (e) { throw e; } },
    get: (sql, params) => { try { return sqlite.prepare(sql).get(...(params || [])); } catch (e) { throw e; } },
    run: (sql, params) => { try { return sqlite.prepare(sql).run(...(params || [])); } catch (e) { throw e; } },
    transaction: (fn) => sqlite.transaction(fn),
    close: () => sqlite.close(),
  };
}

module.exports = db;
