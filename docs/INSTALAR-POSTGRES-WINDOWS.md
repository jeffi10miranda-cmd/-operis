# PostgreSQL no Windows (OPERIS)

O backend **precisa** do PostgreSQL. Sem ele, o login mostra *"A API não está disponível"*.

## Opção 1 — Instalador oficial (recomendado)

1. Baixe: https://www.postgresql.org/download/windows/
2. Instale com senha do usuário `postgres` (anote a senha).
3. Na instalação, porta **5432** e componente **pgAdmin** (opcional).

### Criar banco e usuário OPERIS

Abra **SQL Shell (psql)** ou pgAdmin e execute:

```sql
CREATE USER operis WITH PASSWORD 'senha123';
CREATE DATABASE operis_db OWNER operis;
GRANT ALL PRIVILEGES ON DATABASE operis_db TO operis;
```

Se esse usuário já existir, ajuste a senha no `backend/.env` para a senha real do banco local.

### Subir o backend

```powershell
cd c:\PROJETOS\Operis\backend
npm install
npm run setup
npm run dev
```

Teste: http://localhost:3003/health deve retornar `{"status":"ok",...}`

## Opção 2 — winget

```powershell
winget install PostgreSQL.PostgreSQL.17 --accept-package-agreements
```

Depois crie o banco como acima.

## Opção 3 — Docker (se tiver Docker Desktop)

```powershell
cd c:\PROJETOS\Operis
docker compose up -d postgres
cd backend
npm run setup
npm run dev
```

## Frontend

```powershell
cd c:\PROJETOS\Operis\frontend
npm run dev
```

Acesse: **http://localhost:3002/login**

Login seed: `admin@operis.com.br` / `operis@2025`
