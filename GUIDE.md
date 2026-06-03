# Guia de Migração para PostgreSQL e Deploy (GitHub + Vercel)

## 1. Cria uma conta gratuita no Neon (PostgreSQL)

1. Acede a https://neon.tech e regista-te
2. Cria um novo projecto → "SmartPaper"
3. Região: escolhe a mais próxima (ex: US East)
4. Copia a **connection string** (DATABASE_URL)
   - Parece-se com: `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/smartpaper?sslmode=require`

---

## 2. Configura o Backend para PostgreSQL

### 2.1. Define a variável de ambiente

No ficheiro `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/smartpaper?sslmode=require
```

### 2.2. Executa a migração manual (opcional)

O servidor cria as tabelas automaticamente ao iniciar com `DATABASE_URL` definida.
Se quiseres executar manualmente:

```bash
# Instala psql ou usa o console do Neon
# Copia o conteúdo de backend/migrate.sql e cola no query editor do Neon
```

### 2.3. Testa o backend

```bash
cd smartpaper/backend
npm start
```

Deve aparecer: "Modo: PostgreSQL" e "Base de dados PostgreSQL inicializada com sucesso"

---

## 3. Cria o repositório no GitHub

### 3.1. Usa a interface web do GitHub

1. Acede a https://github.com
2. Clica em **"+" → "New repository"**
3. Nome: `smartpaper`
4. Visibilidade: **Private** (ou Public)
5. **Não** inicializar com README (já temos o projecto)
6. Clica em **"Create repository"**

### 3.2. Envia o projecto para o GitHub

```bash
# Abre o terminal na pasta smartpaper
cd "C:\Users\administrator\Documents\op\smartpaper"

# Inicializa git
git init
git add .
git commit -m "feat: SmartPaper ERP completo"

# Liga ao repositório remoto
git remote add origin https://github.com/TEU_USUARIO/smartpaper.git

# Envia para o GitHub
git branch -M main
git push -u origin main
```

---

## 4. Faz deploy na Vercel

### 4.1. Frontend (Vercel)

1. Acede a https://vercel.com e faz login com o GitHub
2. Clica em **"Add New..." → "Project"**
3. Importa o repositório `smartpaper`
4. **Configuração do projecto:**
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Clica em **"Deploy"**

### 4.2. Backend (Vercel como Serverless Functions)

O backend pode ser deployado como API serverless na Vercel.

**Opção A: Usar Vercel para o backend também**

1. No mesmo projecto da Vercel, vai a **"Settings" → "Functions"**
2. Cria um `vercel.json` na raiz do projecto:

```json
{
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/server.js" }
  ]
}
```

3. Em **"Environment Variables"**, adiciona:
   - `DATABASE_URL` → a connection string do Neon
   - `JWT_SECRET` → uma chave secreta forte
   - `CORS_ORIGIN` → a URL do frontend na Vercel (ex: `https://smartpaper.vercel.app`)

**Opção B: Usar Railway (mais fácil para o backend)**

1. Acede a https://railway.app
2. Clica em **"New Project" → "Deploy from GitHub repo"**
3. Selecciona o repositório `smartpaper`
4. **Root Directory:** `backend`
5. **Start Command:** `node server.js`
6. Em **"Variables"**, adiciona:
   - `DATABASE_URL` → connection string do Neon
   - `JWT_SECRET` → chave secreta
   - `PORT` → `3001`
   - `CORS_ORIGIN` → URL do frontend na Vercel

---

## 5. Actualiza o frontend para apontar para o backend em produção

No ficheiro `frontend/src/context/AuthContext.jsx`:

```javascript
// Para desenvolvimento local:
// const API = 'http://localhost:3001/api';

// Para produção (substituir pela URL real):
const API = 'https://smartpaper-api.railway.app/api';  // Se usares Railway
// ou
const API = 'https://smartpaper.vercel.app/api';  // Se usares Vercel
```

---

## 6. Faz o build do frontend para produção

```bash
cd smartpaper/frontend
npm run build
```

Isso gera a pasta `dist/` com os ficheiros estáticos.

---

## 7. Resumo: Serviços gratuitos usados

| Serviço    | Função                  | Plano Gratuito                     |
|------------|-------------------------|------------------------------------|
| **Neon**   | PostgreSQL hospedado    | 500MB, sempre free                 |
| **GitHub** | Repositório de código   | Repositórios privados ilimitados   |
| **Vercel** | Frontend (React)        | Hospedagem estática gratuita       |
| **Railway**| Backend (Node.js)       | $5/mês ou uso esporádico gratuito  |

---

## 8. Comandos úteis para desenvolvimento

```bash
# Backend (local, SQLite)
cd smartpaper/backend && npm run dev

# Backend (local, PostgreSQL)
DATABASE_URL=postgresql://... npm run dev

# Frontend
cd smartpaper/frontend && npm run dev

# Build frontend
cd smartpaper/frontend && npm run build
```

---

## 9. Notas importantes

- O ficheiro `database.js` agora suporta **SQLite** (local) e **PostgreSQL** (produção)
- A chave `DATABASE_URL` no `.env` activa automaticamente o PostgreSQL
- Sem `DATABASE_URL`, o sistema usa SQLite (recomendado para desenvolvimento)
- As imagens (`logo.png`, `operador.png`) devem ser colocadas em `frontend/src/assets/`
- Altera a senha padrão (`admin123`) após o primeiro login em produção
