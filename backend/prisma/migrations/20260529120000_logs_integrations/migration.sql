-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('PRIMEIRO', 'SEGUNDO', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "StatusOperacional" AS ENUM ('EM_PRODUCAO', 'SETUP', 'SETUP_DE_COR', 'REGULAGEM', 'FERRAMENTARIA', 'MANUTENCAO', 'AGUARDANDO_MP', 'AGUARDANDO_TECNICO', 'AGUARDANDO_LIBERACAO', 'AGUARDANDO_ESTUFAGEM', 'REINICIO', 'TRYOUT', 'TROCA_DE_VERSAO', 'FORA_DA_COR_PADRAO', 'INATIVA');

-- CreateEnum
CREATE TYPE "AlertaTipo" AS ENUM ('CICLO_ACIMA', 'CICLO_ABAIXO', 'CAVIDADE_ABAIXO', 'TROCA_PRODUTO', 'MAQUINA_PARADA', 'SETUP_EXCESSIVO', 'RECORRENCIA', 'DIVERGENCIA_PADRAO', 'NOVO_OP', 'SEM_LEITURA');

-- CreateEnum
CREATE TYPE "AlertaSeveridade" AS ENUM ('CRITICO', 'ATENCAO', 'INFO');

-- CreateEnum
CREATE TYPE "LogSeveridade" AS ENUM ('INFO', 'ATENCAO', 'CRITICO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ciclopadrao" INTEGER NOT NULL,
    "cavidadepadrao" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots_turnos" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "turno" "Turno" NOT NULL,
    "maquina" TEXT NOT NULL,
    "produtoId" TEXT,
    "produtoNome" TEXT,
    "cicloAtual" INTEGER,
    "cavidadeReal" INTEGER,
    "velocidade" DOUBLE PRECISION,
    "status" "StatusOperacional" NOT NULL,
    "observacao" TEXT,
    "divergente" BOOLEAN NOT NULL DEFAULT false,
    "capturadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "totalMaquinas" INTEGER NOT NULL,
    "emProducao" INTEGER NOT NULL DEFAULT 0,
    "emSetup" INTEGER NOT NULL DEFAULT 0,
    "emRegulagem" INTEGER NOT NULL DEFAULT 0,
    "aguardando" INTEGER NOT NULL DEFAULT 0,
    "paradas" INTEGER NOT NULL DEFAULT 0,
    "inativas" INTEGER NOT NULL DEFAULT 0,
    "divergencias" INTEGER NOT NULL DEFAULT 0,
    "totalAlertas" INTEGER NOT NULL DEFAULT 0,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rondas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rondas_turnos" (
    "id" TEXT NOT NULL,
    "rondaId" TEXT NOT NULL,
    "turno" "Turno" NOT NULL,
    "totalMaquinas" INTEGER NOT NULL,
    "emProducao" INTEGER NOT NULL DEFAULT 0,
    "emSetup" INTEGER NOT NULL DEFAULT 0,
    "emRegulagem" INTEGER NOT NULL DEFAULT 0,
    "aguardando" INTEGER NOT NULL DEFAULT 0,
    "paradas" INTEGER NOT NULL DEFAULT 0,
    "inativas" INTEGER NOT NULL DEFAULT 0,
    "divergencias" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rondas_turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT,
    "maquina" TEXT NOT NULL,
    "tipo" "AlertaTipo" NOT NULL,
    "severidade" "AlertaSeveridade" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "resolvidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'string',

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "severidade" "LogSeveridade" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "urlGoogleSheet" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");

-- CreateIndex
CREATE INDEX "snapshots_turnos_data_idx" ON "snapshots_turnos"("data");

-- CreateIndex
CREATE INDEX "snapshots_turnos_maquina_idx" ON "snapshots_turnos"("maquina");

-- CreateIndex
CREATE INDEX "snapshots_turnos_status_idx" ON "snapshots_turnos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_turnos_data_turno_maquina_key" ON "snapshots_turnos"("data", "turno", "maquina");

-- CreateIndex
CREATE UNIQUE INDEX "rondas_data_key" ON "rondas"("data");

-- CreateIndex
CREATE UNIQUE INDEX "rondas_turnos_rondaId_turno_key" ON "rondas_turnos"("rondaId", "turno");

-- CreateIndex
CREATE INDEX "alertas_maquina_idx" ON "alertas"("maquina");

-- CreateIndex
CREATE INDEX "alertas_tipo_idx" ON "alertas"("tipo");

-- CreateIndex
CREATE INDEX "alertas_lido_idx" ON "alertas"("lido");

-- CreateIndex
CREATE INDEX "alertas_criadoEm_idx" ON "alertas"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- CreateIndex
CREATE INDEX "logs_modulo_idx" ON "logs"("modulo");

-- CreateIndex
CREATE INDEX "logs_severidade_idx" ON "logs"("severidade");

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshots_turnos" ADD CONSTRAINT "snapshots_turnos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rondas_turnos" ADD CONSTRAINT "rondas_turnos_rondaId_fkey" FOREIGN KEY ("rondaId") REFERENCES "rondas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots_turnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_criadoPor_fkey" FOREIGN KEY ("criadoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
