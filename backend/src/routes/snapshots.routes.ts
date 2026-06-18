// OPERIS — Rotas: Snapshots de Turno

import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth.middleware';
import { Turno, StatusOperacional } from '@prisma/client';
import { detectarDivergencia } from '../services/snapshots.service';
import { alertasService } from '../services/alertas.service';

export const snapshotsRouter = Router();
snapshotsRouter.use(authenticate);

// GET /api/snapshots/ultima-data
// Retorna a data do snapshot mais recente (útil para fallback na Central)
snapshotsRouter.get('/ultima-data', async (_req, res, next) => {
  try {
    const ultimo = await prisma.snapshotTurno.findFirst({
      orderBy: { data: 'desc' },
      select: { data: true }
    });
    if (ultimo) {
      res.json({ data: ultimo.data.toISOString().slice(0, 10) });
    } else {
      res.json({ data: new Date().toISOString().slice(0, 10) });
    }
  } catch (e) { next(e); }
});

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
      emProducao:     all.filter(s => s.status === 'EM_PRODUCAO').length,
      setup:          all.filter(s => ['SETUP','SETUP_DE_COR','FORA_DA_COR_PADRAO'].includes(s.status)).length,
      regulagem:      all.filter(s => s.status === 'REGULAGEM').length,
      aguardando:     all.filter(s => s.status.startsWith('AGUARDANDO')).length,
      paradas:        all.filter(s => ['MANUTENCAO','FERRAMENTARIA'].includes(s.status)).length,
      inativas:       all.filter(s => s.status === 'INATIVA').length,
      divergentes:    all.filter(s => s.divergente).length,
      totalOPs:       all.reduce((acc, s) => acc + (s.qtdOP    ?? 0), 0),
      totalAcumulado: all.reduce((acc, s) => acc + (s.qtdAtual ?? 0), 0),
      ultimaAtualizacao: new Date().toISOString(),
    };

    res.json(kpis);
  } catch (e) { next(e); }
});

// GET /api/snapshots/historico?data=YYYY-MM-DD&turno=optional
snapshotsRouter.get('/historico', async (req, res, next) => {
  try {
    const dataParam  = req.query.data  as string | undefined;
    const turnoRaw   = req.query.turno as string  | undefined;

    const todasOPs   = req.query.todasOPs === 'true';

    const TURNOS_VALIDOS: Turno[] = ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'];
    const turnoParam = turnoRaw && TURNOS_VALIDOS.includes(turnoRaw as Turno)
      ? (turnoRaw as Turno) : undefined;

    const data = dataParam ? new Date(dataParam + 'T00:00:00') : new Date();
    data.setHours(0, 0, 0, 0);

    const snaps = await prisma.snapshotTurno.findMany({
      where: { data, ...(turnoParam ? { turno: turnoParam } : {}) },
      include: { produto: true },
      orderBy: [{ maquina: 'asc' }, { capturadoEm: 'desc' }],
    });

    // Deduplica por máquina+turno (ou máquina+turno+OP se todasOPs=true) mantendo o mais recente
    const map = new Map<string, typeof snaps[0]>();
    for (const s of snaps) {
      const key = todasOPs ? `${s.maquina}::${s.turno}::${s.op ?? 'NO_OP'}` : `${s.maquina}::${s.turno}`;
      if (!map.has(key) || s.capturadoEm > map.get(key)!.capturadoEm) map.set(key, s);
    }

    const result = [...map.values()]
      .sort((a, b) => {
        const na = Number(a.maquina.replace(/\D/g, ''));
        const nb = Number(b.maquina.replace(/\D/g, ''));
        return na - nb || a.turno.localeCompare(b.turno);
      })
      .map((s, i) => {
        const cavPadrao = s.produto?.cavidadepadrao ?? null;
        const cavReal   = s.cavidadeReal;
        return {
          idx:       i + 1,
          maquina:   s.maquina,
          turno:     s.turno,
          op:        s.op,
          descricao: s.produtoNome ?? s.produto?.descricao ?? null,
          qtdOP:     s.qtdOP,
          qtdAtual:  s.qtdAtual,
          ciclo:     s.produto?.ciclopadrao ?? null,
          cicloReal: s.cicloAtual,
          cav:       cavPadrao,
          cavFec:    cavPadrao != null && cavReal != null ? cavPadrao - cavReal : null,
          status:    s.status,
          divergente: s.divergente,
        };
      });

    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/snapshots/horas-status?data=YYYY-MM-DD
// Retorna horas acumuladas por máquina × status (base: 8h por turno registrado)
snapshotsRouter.get('/horas-status', async (req, res, next) => {
  try {
    const dataParam = req.query.data as string | undefined;
    const data = dataParam ? new Date(dataParam + 'T00:00:00') : new Date();
    data.setHours(0, 0, 0, 0);

    const snapshots = await prisma.snapshotTurno.findMany({
      where: { data },
      orderBy: [{ maquina: 'asc' }, { turno: 'asc' }],
    });

    // Cada turno representa ~8h; agrupa por (maquina, status)
    const map = new Map<string, { maquina: string; status: string; produtoNome: string | null; horas: number }>();
    for (const s of snapshots) {
      const key = `${s.maquina}::${s.status}`;
      if (!map.has(key)) map.set(key, { maquina: s.maquina, status: s.status, produtoNome: s.produtoNome, horas: 0 });
      map.get(key)!.horas += 8;
    }

    res.json(Array.from(map.values()));
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
    const { status, op, qtdOP, qtdAtual, observacao, liberarSync,
            cicloAtual, cavidadeReal, produtoNome, produtoId: produtoIdParam,
            data: dataParam, turno: turnoParam } = req.body;

    const data = dataParam ? new Date(dataParam + 'T00:00:00') : new Date();
    data.setHours(0, 0, 0, 0);

    // Calcula turno pelo horário atual (fallback quando não enviado pelo cliente)
    const h = new Date().getHours();
    const turnoCalc: Turno = h >= 6 && h < 14 ? 'PRIMEIRO' : h >= 14 && h < 22 ? 'SEGUNDO' : 'TERCEIRO';
    const turnoAlvo: Turno = (turnoParam as Turno) || turnoCalc;

    // Busca snapshot existente filtrando pelo turno correto
    const existing = await prisma.snapshotTurno.findFirst({
      where: { maquina: req.params.maquina, data, turno: turnoAlvo },
      orderBy: { capturadoEm: 'desc' },
    });

    // Resolve produtoId e o produto completo: usa o ID enviado ou busca pelo nome
    let produtoId: string | null = produtoIdParam ?? null;
    let produtoObj = null;
    if (produtoId) {
      produtoObj = await prisma.produto.findUnique({ where: { id: produtoId } });
    } else if (produtoNome) {
      produtoObj = await prisma.produto.findFirst({
        where: { descricao: { equals: produtoNome, mode: 'insensitive' } },
      }) ?? await prisma.produto.findFirst({
        where: { descricao: { contains: produtoNome, mode: 'insensitive' } },
      });
      produtoId = produtoObj?.id ?? null;
    } else if (existing?.produtoId) {
      produtoObj = await prisma.produto.findUnique({ where: { id: existing.produtoId } });
      produtoId = produtoObj?.id ?? null;
    }

    let updatedSnapshot;

    if (existing) {
      const statusChanged = status !== undefined && status !== existing.status;
      
      const novoCicloAtual = cicloAtual !== undefined && cicloAtual !== '' ? Number(cicloAtual) : existing.cicloAtual;
      const novaCavidadeReal = cavidadeReal !== undefined && cavidadeReal !== '' ? Number(cavidadeReal) : existing.cavidadeReal;
      const divergente = produtoObj ? detectarDivergencia({ cicloAtual: novoCicloAtual, cavidadeReal: novaCavidadeReal }, produtoObj) : existing.divergente;

      updatedSnapshot = await prisma.snapshotTurno.update({
        where: { id: existing.id },
        data: {
          ...(status      !== undefined ? { status:      status as StatusOperacional } : {}),
          ...(op          !== undefined ? { op }                                       : {}),
          ...(qtdOP       !== undefined ? { qtdOP:       Number(qtdOP)    }           : {}),
          ...(qtdAtual    !== undefined ? { qtdAtual:    Number(qtdAtual) }           : {}),
          ...(cicloAtual  !== undefined && cicloAtual !== '' ? { cicloAtual:  Number(cicloAtual)  } : {}),
          ...(cavidadeReal !== undefined && cavidadeReal !== '' ? { cavidadeReal: Number(cavidadeReal) } : {}),
          ...(observacao  !== undefined ? { observacao }                              : {}),
          ...(produtoNome !== undefined ? { produtoNome, produtoId }                 : {}),
          divergente,
          manualOverride: liberarSync ? false : true,
          capturadoEm: new Date(),
          ...(statusChanged ? { statusAtualizadoEm: new Date() } : {}),
        },
      });
    } else {
      const novoCicloAtual = cicloAtual !== undefined && cicloAtual !== '' ? Number(cicloAtual) : null;
      const novaCavidadeReal = cavidadeReal !== undefined && cavidadeReal !== '' ? Number(cavidadeReal) : null;
      const divergente = produtoObj ? detectarDivergencia({ cicloAtual: novoCicloAtual, cavidadeReal: novaCavidadeReal }, produtoObj) : false;

      // Sem snapshot existente — cria um novo com o turno selecionado
      updatedSnapshot = await prisma.snapshotTurno.create({
        data: {
          data,
          turno:       turnoAlvo,
          maquina:     req.params.maquina,
          status:      (status || 'INATIVA') as StatusOperacional,
          op:          op          ?? null,
          qtdOP:       qtdOP       != null ? Number(qtdOP)       : null,
          qtdAtual:    qtdAtual    != null ? Number(qtdAtual)    : null,
          cicloAtual:  novoCicloAtual,
          cavidadeReal:novaCavidadeReal,
          produtoNome: produtoNome ?? null,
          produtoId:   produtoId,
          observacao:  observacao  ?? null,
          divergente,
          manualOverride: true,
        },
      });
    }
    if (updatedSnapshot.divergente && produtoObj) {
      await alertasService.gerarAlertasDivergencia(updatedSnapshot, produtoObj);
    }
    
    if (['MANUTENCAO', 'FERRAMENTARIA'].includes(updatedSnapshot.status)) {
      await alertasService.gerarAlertaParada(updatedSnapshot);
    }

    res.json(updatedSnapshot);
  } catch (e) { next(e); }
});
