/* ── Migrador: SQLite → PostgreSQL ──
 * Uso: node migrar-para-postgres.js
 * Lê todos os dados do SQLite e insere no PostgreSQL.
 * Requer DATABASE_URL configurada no .env
 * O servidor NÃO deve estar a correr durante a migração. */

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('ERRO: Define DATABASE_URL no .env para conectar ao PostgreSQL.');
  process.exit(1);
}

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const sqlite = new Database(path.join(__dirname, 'smartpaper.db'));
const pg = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function convertParams(sql, params) {
  let idx = 0;
  const converted = sql.replace(/\?/g, () => `$${++idx}`);
  return { sql: converted, params: params || [] };
}

async function migrar() {
  console.log('A migrar dados do SQLite para PostgreSQL...\n');

  const tabelas = [
    { nome: 'utilizadores', select: 'SELECT * FROM utilizadores ORDER BY id' },
    { nome: 'clientes', select: 'SELECT * FROM clientes ORDER BY id' },
    { nome: 'servicos', select: 'SELECT * FROM servicos ORDER BY id' },
    { nome: 'pedidos', select: 'SELECT * FROM pedidos ORDER BY id' },
    { nome: 'pedido_itens', select: 'SELECT * FROM pedido_itens ORDER BY id' },
    { nome: 'pagamentos', select: 'SELECT * FROM pagamentos ORDER BY id' },
    { nome: 'tarefas', select: 'SELECT * FROM tarefas ORDER BY id' },
    { nome: 'atividades', select: 'SELECT * FROM atividades ORDER BY id' },
  ];

  for (const tabela of tabelas) {
    try {
      const linhas = sqlite.prepare(tabela.select).all();
      if (linhas.length === 0) {
        console.log(`  ${tabela.nome}: 0 linhas (saltar)`);
        continue;
      }

      const colunas = Object.keys(linhas[0]);
      const placeholders = colunas.map(() => '?').join(', ');
      const colunasStr = colunas.join(', ');
      const sql = `INSERT INTO ${tabela.nome} (${colunasStr}) VALUES (${placeholders})`;

      for (const linha of linhas) {
        const valores = colunas.map(c => linha[c]);
        const q = convertParams(sql, valores);
        await pg.query(q.sql, q.params);
      }

      console.log(`  ${tabela.nome}: ${linhas.length} linha(s) migrada(s)`);
    } catch (err) {
      console.error(`  ${tabela.nome}: ERRO -`, err.message);
    }
  }

  await pg.end();
  sqlite.close();
  console.log('\nMigração concluída!');
}

migrar().catch(err => { console.error('Falha na migração:', err); process.exit(1); });
