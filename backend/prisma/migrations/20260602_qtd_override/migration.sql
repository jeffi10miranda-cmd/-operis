ALTER TABLE "snapshots_turnos" ADD COLUMN IF NOT EXISTS "qtdAtual" INTEGER;
ALTER TABLE "snapshots_turnos" ADD COLUMN IF NOT EXISTS "manualOverride" BOOLEAN NOT NULL DEFAULT false;
