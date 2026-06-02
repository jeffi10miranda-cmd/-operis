# OPERIS — Deploy: Vercel (Frontend) + Render (Backend) + Neon (Banco)

## Visão Geral da Arquitetura

```
Browser
  │
  ├──► Vercel (Next.js)          → https://operis.vercel.app
  │         │
  │         └── NEXT_PUBLIC_API_URL ──► Render (Express API)
  │         └── NEXT_PUBLIC_WS_URL  ──► Render (Socket.io)
  │
  └──► Render (Node.js Backend)  → https://operis-backend.onrender.com
            │
            └── DATABASE_URL ──► Neon PostgreSQL
```

> **Atenção Socket.io:** O Vercel é serverless — não suporta WebSockets.
> O frontend conecta diretamente ao Render para WebSocket e para a API.

---

## Pré-requisitos

- [ ] Conta no [Vercel](https://vercel.com) (gratuita)
- [ ] Conta no [Render](https://render.com) (gratuita)
- [ ] Banco de dados Neon já configurado (DATABASE_URL e DIRECT_URL em mãos)
- [ ] Repositório no GitHub: https://github.com/jeffi10miranda-cmd/-operis

---

## PARTE 1 — Backend no Render

### 1.1 Criar o Web Service

1. Acesse **dashboard.render.com** → **New +** → **Web Service**
2. Conecte o repositório: `jeffi10miranda-cmd/-operis`
3. Configure:

| Campo | Valor |
|---|---|
| **Name** | `operis-backend` |
| **Region** | South America (São Paulo) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npx prisma migrate deploy && node dist/server.js` |
| **Plan** | Free (ou Starter $7/mês para sempre ligado) |

> O `postinstall` do package.json já roda `prisma generate` automaticamente no `npm ci`.

### 1.2 Variáveis de Ambiente no Render

Em **Environment** → **Add Environment Variable**, adicione:

```
NODE_ENV                    = production
PORT                        = 3003
DATABASE_URL                = postgresql://neondb_owner:SENHA@ep-winter-boat-aclissz1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL                  = postgresql://neondb_owner:SENHA@ep-winter-boat-aclissz1.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
FRONTEND_URL                = https://SEU-APP.vercel.app     ← preencher após deploy do Vercel
JWT_SECRET                  = (gere: openssl rand -base64 32)
JWT_EXPIRES_IN              = 8h
GOOGLE_SERVICE_ACCOUNT_EMAIL = (deixar vazio por ora)
GOOGLE_PRIVATE_KEY          = (deixar vazio por ora)
SHEET_ID_TURNO_1            = (deixar vazio por ora)
SHEET_ID_TURNO_2            = (deixar vazio por ora)
SHEET_ID_TURNO_3            = (deixar vazio por ora)
SYNC_INTERVAL_MINUTES       = 1
ALERT_CICLO_DESVIO_PERCENT  = 10
ALERT_SETUP_MAX_MINUTOS     = 60
```

### 1.3 Deploy e Seed inicial

Clique em **Create Web Service**. Aguarde o build (~3-5 min).

Após o primeiro deploy, rode o seed pelo **Shell** do Render:
```bash
npx tsx src/prisma/seed.ts
```

Isso cria:
- Usuário admin: `admin@operis.com.br` / `operis@2025`
- Usuário supervisor: `supervisor@operis.com.br` / `supervisor@2025`
- 42 produtos no banco mestre

Anote a URL do backend: `https://operis-backend.onrender.com`

---

## PARTE 2 — Frontend no Vercel

### 2.1 Importar o Projeto

1. Acesse **vercel.com** → **Add New Project**
2. Importe: `jeffi10miranda-cmd/-operis`
3. Configure:

| Campo | Valor |
|---|---|
| **Root Directory** | `frontend` |
| **Framework Preset** | Next.js (auto-detectado) |
| **Build Command** | `npm run build` (padrão) |
| **Output Directory** | `.next` (padrão) |
| **Install Command** | `npm ci` (padrão) |

### 2.2 Variáveis de Ambiente no Vercel

Em **Environment Variables**, adicione:

```
NEXT_PUBLIC_API_URL  = https://operis-backend.onrender.com
NEXT_PUBLIC_WS_URL   = https://operis-backend.onrender.com
```

> Essas variáveis são embutidas no bundle durante o build do Vercel.
> Não é necessário o Dockerfile — o Vercel builda Next.js nativamente.

### 2.3 Deploy

Clique em **Deploy**. Aguarde o build (~2-3 min).

Anote a URL do frontend: `https://operis-abc123.vercel.app`

---

## PARTE 3 — Conectar Frontend ↔ Backend (CORS)

Após ter as duas URLs:

1. No Render → **operis-backend** → **Environment**
2. Atualize `FRONTEND_URL` com a URL real do Vercel:
   ```
   FRONTEND_URL = https://operis-abc123.vercel.app
   ```
3. O Render faz redeploy automático

---

## PARTE 4 — Verificar que Tudo Funciona

```bash
# 1. Testar API do backend
curl https://operis-backend.onrender.com/health
# Esperado: {"status":"ok","service":"OPERIS API",...}

# 2. Testar CORS
curl -H "Origin: https://operis-abc123.vercel.app" \
     https://operis-backend.onrender.com/health
# Deve retornar sem erro de CORS

# 3. Acessar o frontend
# Abrir no navegador: https://operis-abc123.vercel.app
# Login: admin@operis.com.br / operis@2025
```

---

## Resumo das Variáveis por Serviço

### Render (Backend)
| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL pooler do Neon |
| `DIRECT_URL` | URL direta do Neon (sem -pooler) |
| `FRONTEND_URL` | https://SEU-APP.vercel.app |
| `JWT_SECRET` | chave aleatória forte |

### Vercel (Frontend)
| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | https://operis-backend.onrender.com |
| `NEXT_PUBLIC_WS_URL` | https://operis-backend.onrender.com |

---

## Limitações do Plano Free

| Serviço | Limitação |
|---|---|
| **Render Free** | Serviço hiberna após 15 min sem requisições. Cold start: ~30-60s |
| **Render Free** | Socket.io pode ser desconectado após inatividade |
| **Vercel Free** | 100 GB de bandwidth/mês — mais que suficiente |
| **Neon Free** | 0.5 GB de armazenamento, 1 branch |

Para uso em produção diária, considere o **Render Starter ($7/mês)** para manter o backend sempre ligado.

---

## Atualizar o Sistema

A cada push para `main`, Vercel e Render fazem redeploy automaticamente.

```bash
# No seu PC
git add .
git commit -m "descrição da mudança"
git push
# ↑ dispara rebuild automático no Vercel e Render
```

---

## Credenciais Padrão (alterar após primeiro login)

| Campo | Valor |
|---|---|
| Admin email | `admin@operis.com.br` |
| Admin senha | `operis@2025` |
| Supervisor email | `supervisor@operis.com.br` |
| Supervisor senha | `supervisor@2025` |
