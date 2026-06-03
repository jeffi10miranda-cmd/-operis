// OPERIS — Rotas: Snapshots de Turno

import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth.middleware';
import { Turno, StatusOperacional } from '@prisma/client';

export const snapshotsRouter = Router();
snapshotsRouter.use(authenticate);

// GET /api/snapshots/hoje?turno=X&data=YYYY-MM-DD
// Retorna snapshots do dia (padrão: hoje) filtrados por turno opcional
snapshotsRouter.get('/hoje', async (req, res, next) => {
  try {
    const dataParam = req.query.data as string | undefined;
    const hoje = dataParam ? new Date(dataParam + 'T00:00:00') : new Date();
    hoje.setHours(0, 0, 0, 0);

    const turno = req.query.turno as Turno | undefined;

    const snapshots = await prisma.snapshotTurno.findMany({
      where: {
        data: hoje,
        ...(turno ? { turno } : {}),
      },
      include: { produto: true },
      orderBy: [{ turno: 'asc' }, { maquina: 'asc' }],
    });

    // Agrupa por máquina (estado mais recente)
    const maquinas = new Map<string, typeof snapshots[0]>();
    for (const s of snapshots) {
      const existing = maquinas.get(s.maquina);
      if (!existing || s.capturadoEm > existing.capturadoEm) {
        maquinas.set(s.maquina, s);
      }
    }

    res.json([...maquinas.values()].sort((a, b) => a.maquina.localeCompare(b.maquina)));
  } catch (e) { next(e); }
});

// GET /api/snapshots/ultimo
// Retorna o snapshot mais recente de cada maquina (independente de data/turno)
// Usado para pre-popular ronda manual quando nao ha sync do Sheets
snapshotsRouter.get('/ultimo', async (_req, res, next) => {
  try {
    const snaps = await prisma.snapshotTurno.findMany({
      include: { produto: true },
      orderBy: { capturadoEm: 'desc' },
    });
    const maquinas = new Map<string, typeof snaps[0]>();
    for (const s of snaps) {
      if (!maquinas.has(s.maquina)) maquinas.set(s.maquina, s);
    }
    res.json([...maquinas.values()].sort((a, b) => a.maquina.localeCompare(b.maquina)));
  } catch (e) { next(e); }
});

// GET /api/snapshots/kpis
// KPIs da Central (contagem por status)
snapshotsRouter.get('/kpis', async (_req, res, next) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const snapshots = await prisma.snapshotTurno.findMany({ where: { data: hoje } });

    const maquinas = new Map<string, typeof snapshots[0]>();
    for (const s of snapshots) {
      const ex = maquinas.get(s.maquina);
      if (!ex || s.capturadoEm > ex.capturadoEm) maquinas.set(s.maquina, s);
    }

    const all = [...maquinas.values()];
    const total = all.length;

    const kpis = {
      total,
      emProducao:  all.filter(s => s.status === 'EM_PRODUCAO').length,
      setup:       all.filter(s => ['SETUP','SETUP_DE_COR','FORA_DA_COR_PADRAO'].includes(s.status)).length,
      regulagem:   all.filter(s => s.status === 'REGULAGEM').length,
      aguardando:  all.filter(s => s.status.startsWith('AGUARDANDO')).length,
      paradas:     all.filter(s => ['MANUTENCAO','FERRAMENTARIA'].includes(s.status)).length,
      inativas:    all.filter(s => s.status === 'INATIVA').length,
      divergentes: all.filter(s => s.divergente).length,
      ultimaAtualizacao: new Date().toISOString(),
    };

    res.json(kpis);
  } catch (e) { next(e); }
});

// GET /api/snapshots/maquina/:id
snapshotsRouter.get('/maquina/:id', async (req, res, next) => {
  try {
    const { dataInicio, dataFim } = req.query;

    const snapshots = await prisma.snapshotTurno.findMany({
      where: {
        maquina: req.params.id,
        ...(dataInicio || dataFim ? {
          data: {
            ...(dataInicio ? { gte: new Date(String(dataInicio)) } : {}),
            ...(dataFim ? { lte: new Date(String(dataFim)) } : {}),
          },
        } : {}),
      },
      include: { produto: true },
      orderBy: [{ data: 'desc' }, { turno: 'asc' }],
      take: 100,
    });

    res.json(snapshots);
  } catch (e) { next(e); }
});

// PATCH /api/snapshots/maquina/:maquina — override manual de status/qtd
snapshotsRouter.patch('/maquina/:maquina', async (req, res, next) => {
  try {
    const { status, op, qtdOP, qtdAtual, observacao, liberarSync, data: dataParam, turno: turnoParam } = req.body;

    const data = dataParam ? new Date(dataParam + 'T00:00:00') : new Date();
    data.setHours(0, 0, 0, 0);

    // Determina turno pelo horário atual se não informado
    function turnoAtual(): Turno {
      const h = new Date().getHours();
      if (h >= 6  && h < 14) return 'PRIMEIRO';
      if (h >= 14 && h < 22) return 'SEGUNDO';
      return 'TERCEIRO';
    }
    const turno: Turno = (turnoParam as Turno) || turnoAtual();

    const updateData = {
      ...(status     !== undefined ? { status: status as StatusOperacional } : {}),
      ...(op         !== undefined ? { op }                                  : {}),
      ...(qtdOP      !== undefined ? { qtdOP: Number(qtdOP) }                : {}),
      ...(qtdAtual   !== undefined ? { qtdAtual: Number(qtdAtual) }          : {}),
      ...(observacao !== undefined ? { observacao }                           : {}),
      manualOverride: liberarSync ? false : true,
    };

    // Upsert: atualiza se existe, cria se não existe
    const updated = await prisma.snapshotTurno.upsert({
      where: { data_turno_maquina: { data, turno, maquina: req.params.maquina } },
      update: updateData,
      create: {
        data,
        turno,
        maquina:       req.params.maquina,
        status:        (status || 'INATIVA') as StatusOperacional,
        op:            op            ?? null,
        qtdOP:         qtdOP         != null ? Number(qtdOP)         : null,
        qtdAtual:      qtdAtual      != null ? Number(qtdAtual)      : null,
        observacao:    observacao    ?? null,
        manualOverride: true,
      },
    });

    res.json(updated);
  } catch (e) { next(e); }
});
