const db = require('./database');

/* ── Cria a tabela atividades se não existir ──
 * Suporta SQLite (desenvolvimento) e PostgreSQL (produção).
 * O schema é recriado dinamicamente conforme o driver em uso. */
function criarTabela() {
  try {
    if (process.env.DATABASE_URL) {
      db.run(`CREATE TABLE IF NOT EXISTS atividades (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        entidade VARCHAR(50) NOT NULL,
        entidade_id INTEGER,
        descricao TEXT NOT NULL,
        utilizador_id INTEGER,
        utilizado_nome VARCHAR(255),
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
    } else {
      db.run(`CREATE TABLE IF NOT EXISTS atividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        entidade TEXT NOT NULL,
        entidade_id INTEGER,
        descricao TEXT NOT NULL,
        utilizador_id INTEGER,
        utilizado_nome TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`);
    }
  } catch (e) {
    console.error('[logging] Erro ao criar tabela atividades:', e.message);
  }
}

criarTabela();

/* ── Regista uma actividade na base de dados ──
 * Utiliza a API unificada do módulo database (db.run com placeholders ?).
 * É síncrona em SQLite, assíncrona em PostgreSQL (mas fire-and-forget). */
function logAtividade({ tipo, entidade, entidade_id, descricao, utilizador_id, utilizado_nome }) {
  try {
    const info = db.run(
      `INSERT INTO atividades (tipo, entidade, entidade_id, descricao, utilizador_id, utilizado_nome) VALUES (?, ?, ?, ?, ?, ?)`,
      [tipo, entidade, entidade_id || null, descricao, utilizador_id || null, utilizado_nome || null]
    );
    return info;
  } catch (err) {
    console.error(`[logging] Erro ao registrar atividade (${tipo} ${entidade}):`, err.message);
  }
}

module.exports = { logAtividade };
