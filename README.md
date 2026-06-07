# SmartPaper ERP — Sistema de Gestão para Loja de Impressão e Papelaria

Sistema web completo para gestão de pedidos, clientes, serviços, pagamentos, tarefas e relatórios de uma loja de impressão e papelaria.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Estrutura do Projecto](#estrutura-do-projecto)
- [Execução Local (Desenvolvimento)](#execução-local-desenvolvimento)
- [Deploy em Produção](#deploy-em-produção)
- [Credenciais](#credenciais)
- [Comandos Úteis](#comandos-úteis)

---

## Pré-requisitos

- **Node.js** v22 ou superior
- **npm** v10 ou superior
- **Git**
- Contas gratuitas em: [GitHub](https://github.com), [Railway](https://railway.app), [Vercel](https://vercel.com), [Neon](https://neon.tech)

---

## Estrutura do Projecto

```
smartpaper/
├── backend/                    # API REST (Express 5)
│   ├── server.js               # Servidor principal
│   ├── database.js             # Abstracção SQLite/PostgreSQL
│   ├── logging.js              # Registo de auditoria
│   ├── middleware/auth.js      # Autenticação JWT
│   ├── routes/                 # Rotas da API
│   │   ├── auth.js
│   │   ├── clientes.js
│   │   ├── servicos.js
│   │   ├── pedidos.js
│   │   ├── pagamentos.js
│   │   ├── tarefas.js
│   │   ├── relatorios.js
│   │   ├── atividades.js
│   │   └── utilizadores.js
│   └── package.json
├── frontend/                   # Interface React (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── components/         # Sidebar, Topbar
│   │   ├── pages/              # 11 páginas
│   │   └── utils/              # helpers, gerarRecibo
│   ├── vercel.json
│   └── package.json
├── README.md
└── .gitignore
```

---

## Execução Local (Desenvolvimento)

### 1. Clonar o repositório

```bash
git clone https://github.com/ramadanepereira/smartpaper1.git
cd smartpaper1
```

### 2. Backend (SQLite — modo local)

```bash
cd backend
npm install
npm run dev
```

O servidor inicia em `http://localhost:3001` no modo **SQLite**.

### 3. Frontend (noutro terminal)

```bash
cd frontend
npm install
npm run dev
```

O frontend inicia em `http://localhost:5173`.

### 4. Aceder ao sistema

Abre `http://localhost:5173` no browser e faz login com:

- **Username:** `admin`
- **Password:** `admin123`

---

## Deploy em Produção

### Passo 1: Criar base de dados PostgreSQL no Neon

1. Acede a https://neon.tech e cria uma conta
2. Clica em **"Create a project"** → nome: `smartpaper`
3. Copia a **connection string** (DATABASE_URL)
   - Formato: `postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require`

### Passo 2: Enviar código para o GitHub

```bash
git init
git add .
git commit -m "Primeiro commit - SmartPaper ERP"
git branch -M main
git remote add origin https://github.com/ramadanepereira/smartpaper1.git
git push -u origin main
```

### Passo 3: Deploy do Backend no Railway

1. Acede a https://railway.app e faz login com GitHub
2. **"Create a New Project"** → **"Deploy from GitHub repo"**
3. Selecciona o repositório `ramadanepereira/smartpaper1`
4. **Root Directory:** `backend`
5. Após o deploy, vai a **Variables** e adiciona:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | A connection string do Neon |
| `JWT_SECRET` | `smartpaper_secret_2026` |
| `CORS_ORIGIN` | `https://smartpaper1.vercel.app` |

6. Vai a **Settings** → **Networking** → **Generate Domain**
7. Copia o domínio gerado (ex: `smartpaper1-production.up.railway.app`)

### Passo 4: Deploy do Frontend na Vercel

1. Acede a https://vercel.com e faz login com GitHub
2. **"Add New..."** → **"Project"**
3. Importa `ramadanepereira/smartpaper1`
4. **Root Directory:** `frontend`
5. **Framework:** Vite
6. **Environment Variables** → **"Add"**:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://smartpaper1-production.up.railway.app/api` |

7. Clica **"Deploy"**

### Passo 5: Finalizar

1. No **Railway**: vai a **Deployments** → **Redeploy** (para aplicar `CORS_ORIGIN`)
2. Na **Vercel**: vai a **Deployments** → **Redeploy** (para aplicar `VITE_API_URL`)
3. Após ambos redeployados, abre o URL do Vercel e faz login

---

## Credenciais

| Perfil | Username | Password |
|--------|----------|----------|
| Administrador | `admin` | `admin123` |

> **Nota:** Altera a password após o primeiro login em produção.

---

## Comandos Úteis

### Desenvolvimento Local

```bash
# Backend (SQLite)
cd backend && npm run dev

# Backend (PostgreSQL local)
DATABASE_URL=postgresql://... npm run dev

# Frontend
cd frontend && npm run dev

# Build do frontend
cd frontend && npm run build
```

### Git

```bash
# Adicionar alterações
git add .
git commit -m "Descrição das alterações"

# Enviar para GitHub
git push

# Actualizar com alterações do repositório
git pull
```

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, Vite 8, Chart.js, jsPDF |
| Backend | Node.js 22, Express 5, JWT, bcryptjs |
| Base de Dados | SQLite (dev) / PostgreSQL (produção) |
| Deploy | Vercel (frontend) + Railway (backend) + Neon (BD) |
| Controlo de Versão | Git + GitHub |
