-- =============================================================
-- Script de migração PostgreSQL para SmartPaper
-- Execute este script no seu banco PostgreSQL antes de iniciar
-- =============================================================

-- Criação das tabelas
CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'operador' CHECK(perfil IN ('admin','operador')),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  email VARCHAR(255),
  tipo VARCHAR(20) NOT NULL DEFAULT 'particular' CHECK(tipo IN ('particular','empresa')),
  nuit VARCHAR(50),
  endereco TEXT,
  notas TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  unidade VARCHAR(20) NOT NULL DEFAULT 'unidade' CHECK(unidade IN ('unidade','pagina','folha')),
  categoria VARCHAR(20) NOT NULL DEFAULT 'outro' CHECK(categoria IN ('impressao','copia','acabamento','outro')),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50) NOT NULL UNIQUE,
  cliente_id INTEGER REFERENCES clientes(id),
  nome_cliente VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','concluido','entregue','cancelado')),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  criado_por INTEGER REFERENCES utilizadores(id),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  servico_id INTEGER REFERENCES servicos(id),
  nome VARCHAR(255) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  valor NUMERIC(10,2) NOT NULL,
  metodo VARCHAR(20) NOT NULL CHECK(metodo IN ('dinheiro','mpesa','emola','cartao')),
  referencia VARCHAR(255),
  notas TEXT,
  criado_por INTEGER REFERENCES utilizadores(id),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarefas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  prazo TIMESTAMP,
  concluida INTEGER NOT NULL DEFAULT 0,
  criado_por INTEGER REFERENCES utilizadores(id),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atividades (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  entidade VARCHAR(50) NOT NULL,
  entidade_id INTEGER,
  descricao TEXT NOT NULL,
  utilizador_id INTEGER REFERENCES utilizadores(id),
  utilizado_nome VARCHAR(255),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed: Utilizador admin (password: admin123)
-- O hash bcrypt abaixo corresponde a 'admin123'
INSERT INTO utilizadores (nome, username, password, perfil)
SELECT 'Administrador', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM utilizadores WHERE username = 'admin');

-- Seed: Serviços pré-configurados
INSERT INTO servicos (nome, descricao, preco, unidade, categoria)
SELECT * FROM (VALUES
  ('Impressão A4 P&B', 'Impressão A4 preto e branco', 5.00, 'pagina', 'impressao'),
  ('Impressão A4 Colorida', 'Impressão A4 colorida', 15.00, 'pagina', 'impressao'),
  ('Impressão A3 P&B', 'Impressão A3 preto e branco', 10.00, 'pagina', 'impressao'),
  ('Impressão A3 Colorida', 'Impressão A3 colorida', 25.00, 'pagina', 'impressao'),
  ('Fotocópia A4', 'Fotocópia simples A4', 3.00, 'pagina', 'copia'),
  ('Fotocópia A3', 'Fotocópia simples A3', 6.00, 'pagina', 'copia'),
  ('Plastificação A4', 'Plastificação de documentos A4', 50.00, 'unidade', 'acabamento'),
  ('Plastificação A3', 'Plastificação de documentos A3', 80.00, 'unidade', 'acabamento'),
  ('Encadernação', 'Encadernação de documentos', 120.00, 'unidade', 'acabamento'),
  ('Digitalização', 'Digitalização por página', 5.00, 'pagina', 'outro')
) AS s
WHERE NOT EXISTS (SELECT 1 FROM servicos LIMIT 1);
