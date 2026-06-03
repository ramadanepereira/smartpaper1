const db = require('./database');

async function logAtividade({ tipo, entidade, entidade_id, descricao, utilizador_id, utilizado_nome }) {
  try {
    const info = await db.run(
      `INSERT INTO atividades (tipo, entidade, entidade_id, descricao, utilizador_id, utilizado_nome) VALUES (?, ?, ?, ?, ?, ?)`,
      [tipo, entidade, entidade_id || null, descricao, utilizador_id || null, utilizado_nome || null]
    );
    return info;
  } catch (err) {
    console.error(`[logging] Erro ao registrar atividade (${tipo} ${entidade}):`, err.message);
  }
}

module.exports = { logAtividade };
