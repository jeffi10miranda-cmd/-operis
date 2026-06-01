# OPERIS — Central Operacional Industrial

Sistema web industrial de monitoramento em tempo real com integração Google Sheets.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 + React + TailwindCSS + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Banco | PostgreSQL |
| ORM | Prisma |
| Tempo real | Socket.io |
| Integração | Google Sheets API v4 |
| Auth | JWT |
| Deploy | Docker Compose |

---

## Estrutura do projeto

```
operis/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # Modelos do banco de dados
│   └── src/
│       ├── server.ts               # Entry point
│       ├── app.ts                  # Express + middlewares
│       ├── config/
│       │   ├── database.ts         # Prisma singleton
│       │   ├── logger.ts           # Winston logger
│       │   └── socket.ts           # Socket.io server
│       ├── services/
│       │   ├── sheets.service.ts   # Google Sheets API
│       │   ├── snapshots.service.ts # Lógica central
│       │   ├── alertas.service.ts  # Geração automática de alertas
│       │   └── comparativos.service.ts
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── produtos.routes.ts
│       │   ├── snapshots.routes.ts
│       │   ├── rondas.routes.ts
│       │   ├── alertas.routes.ts
│       │   ├── comparativos.routes.ts
│       │   ├── configuracao.routes.ts
│       │   └── sheets.routes.ts
│       ├── middlewares/
│       │   ├── auth.middleware.ts  # JWT + RBAC
│       │   ├── errorHandler.ts
│       │   └── requestLogger.ts
│       └── jobs/
│           └── scheduler.ts        # Cron jobs (sync automático)
├── frontend/
│   └── src/
│       ├── lib/api.ts              # Cliente axios + SWR hooks
│       └── hooks/useSocket.ts      # Socket.io client
└── docker-compose.yml
```

## Arquitetura atualizada

### Frontend operacional atual

- `Central`: torre operacional com KPIs, cards de mÃ¡quinas, alertas e comparativos
- `Ronda`: snapshots histÃ³ricos com filtros por janela operacional
- `Comparativos`: leituras comparativas por dia e turno
- `Alertas`: eventos inteligentes por severidade e recorrÃªncia
- `ConfiguraÃ§Ãµes`: integraÃ§Ãµes, regras e governanÃ§a do sistema

### Estrutura de frontend em evoluÃ§Ã£o

```text
frontend/src
  app/
    central/
    ronda/
    comparativos/
    alertas/
    configuracoes/
    login/
  components/
    alertas/
    comparativos/
    configuracoes/
    ronda/
  hooks/
  services/
  types/
  utils/
```

### Documento de arquitetura

Veja [OPERIS-ARCHITECTURE.md](./docs/OPERIS-ARCHITECTURE.md) para a arquitetura alvo do frontend, backend, domÃ­nio e fluxo de sincronizaÃ§Ã£o.

---

## Configuração rápida

### 1. Google Sheets API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto e ative a **Google Sheets API**
3. Crie uma **Service Account** e baixe o JSON de credenciais
4. Compartilhe as 3 planilhas com o email da service account

### Formato esperado nas planilhas

| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E | Coluna F | Coluna G |
|----------|----------|----------|----------|----------|----------|----------|
| Máquina | Produto | Ciclo (s) | Cavidade real | Velocidade | Status | Observação |
| MAQ01 | Frasco reto 12 | 50 | 24 | 120 | Em produção | |
| MAQ02 | Tampa Kelly | 20 | 16 | 110 | Setup | Troca de molde |

### 2. Variáveis de ambiente

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edite com suas credenciais Google e configurações do banco
```

Observações:

- `.env` na raiz é usado pelo `docker-compose.yml`
- `backend/.env` é usado na execução local da API
- `frontend/.env.local` aponta o Next.js para a API na porta `3003`

### 3. Subir com Docker

```bash
docker compose up -d
```

O backend do container agora aplica migrations e executa seed automaticamente no start.

### 4. Ou subir localmente

**Portas padrão (evitam conflito com outros apps na 3000/3001):**

| Serviço   | URL |
|-----------|-----|
| Frontend  | http://localhost:3002 |
| Backend   | http://localhost:3003 |

```bash
# Banco de dados
createdb operis_db

# Backend
cd backend
npm install
npm run setup
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:3002/login**

Para alterar portas, edite `frontend/.env.local` e `backend/.env` (copie de `.env.example`).

---

## API Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/auth/me` | Usuário autenticado |

### Central (Snapshots)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/snapshots/hoje` | Estado atual de todas as máquinas |
| GET | `/api/snapshots/kpis` | KPIs para a Central |
| GET | `/api/snapshots/maquina/:id` | Histórico de uma máquina |

### Rondas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/rondas` | Lista rondas (paginado) |
| GET | `/api/rondas/hoje` | Ronda do dia atual |
| GET | `/api/rondas/:data` | Ronda de uma data específica |

### Alertas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/alertas` | Lista alertas (filtros) |
| GET | `/api/alertas/contagem` | Badge de alertas não lidos |
| PATCH | `/api/alertas/:id/lido` | Marcar como lido |

### Comparativos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/comparativos/dias` | Compara dois dias |
| GET | `/api/comparativos/turnos` | Compara turnos do dia |
| GET | `/api/comparativos/periodo` | Resumo por período |

### Google Sheets
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/sheets/sincronizar` | Dispara sync manual |
| POST | `/api/sheets/testar-conexao` | Testa conexão com planilha |
| GET | `/api/sheets/preview/:turno` | Preview dos dados brutos |

---

## Socket.io — Eventos em tempo real

| Evento | Direção | Descrição |
|--------|---------|-----------|
| `central:atualizado` | Server → Client | Novo snapshot processado |
| `alerta:novo` | Server → Client | Novo alerta gerado |
| `ronda:consolidada` | Server → Client | Ronda do dia consolidada |
| `sync:status` | Server → Client | Status do sync (`iniciando/concluido/erro`) |
| `join:turno` | Client → Server | Entrar na sala de um turno |
| `join:maquina` | Client → Server | Monitorar máquina específica |

---

## Usuários padrão (seed)

| Email | Senha | Role |
|-------|-------|------|
| admin@operis.com.br | operis@2025 | ADMIN |
| supervisor@operis.com.br | supervisor@2025 | SUPERVISOR |

---

## Roles e permissões

| Role | Central | Ronda | Comparativos | Alertas | Configurações |
|------|---------|-------|--------------|---------|---------------|
| VISUALIZADOR | ✅ leitura | ✅ leitura | ✅ leitura | ✅ leitura | ❌ |
| OPERADOR | ✅ | ✅ | ✅ | ✅ marcar lido | ❌ |
| SUPERVISOR | ✅ | ✅ | ✅ | ✅ | ✅ parcial |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ total |
