// OPERIS — Service de Comparativos

import { prisma } from '../config/database';

type PeriodoComparativo = 'ontem_hoje' | 'semana' | 'mes';

export const comparativosService = {
  // ── Compara dois dias ─────────────────────────
  async compararDias(dataA: Date, dataB: Date, filtros?: { maquina?: string }) {
    const where = filtros?.maquina ? { maquina: filtros.maquina } : {};

    const [snapsA, snapsB] = await Promise.all([
      prisma.snapshotTurno.findMany({
        where: { data: dataA, ...where },
        include: { produto: true },
      }),
      prisma.snapshotTurno.findMany({
        where: { data: dataB, ...where },
        include: { produto: true },
      }),
    ]);

    // Agrupa por máquina (último snapshot de cada)
    const mapaA = agruparPorMaquina(snapsA);
    const mapaB = agruparPorMaquina(snapsB);

    const todasMaquinas = new Set([...mapaA.keys(), ...mapaB.keys()]);
    const comparativo = [];

    for (const maquina of todasMaquinas) {
      const a = mapaA.get(maquina);
      const b = mapaB.get(maquina);

      const resultado = analisarDiferenca(a, b);

      comparativo.push({
        maquina,
        anterior: formatarSnapshot(a),
        atual: formatarSnapshot(b),
        resultado: resultado.descricao,
        tipo: resultado.tipo,
        alterado: resultado.alterado,
      });
    }

    return comparativo.sort((a, b) => {
      // Alterados primeiro
      if (a.alterado && !b.alterado) return -1;
      if (!a.alterado && b.alterado) return 1;
      return a.maquina.localeCompare(b.maquina);
    });
  },

  // ── Compara turnos do mesmo dia ───────────────
  async compararTurnos(data: Date) {
    const snapshots = await prisma.snapshotTurno.findMany({
      where: { data },
      include: { produto: true },
      orderBy: [{ maquina: 'asc' }, { turno: 'asc' }],
    });

    const maquinas = [...new Set(snapshots.map(s => s.maquina))];

    return maquinas.map(maquina => {
      const t1 = snapshots.find(s => s.maquina === maquina && s.turno === 'PRIMEIRO');
      const t2 = snapshots.find(s => s.maquina === maquina && s.turno === 'SEGUNDO');
      const t3 = snapshots.find(s => s.maquina === maquina && s.turno === 'TERCEIRO');

      return {
        maquina,
        turno1: formatarSnapshot(t1),
        turno2: formatarSnapshot(t2),
        turno3: formatarSnapshot(t3),
        divergencias: [t1, t2, t3].filter(Boolean).filter(s => s!.divergente).length,
      };
    });
  },

  // ── Evolução de uma máquina no período ────────
  async evolucaoMaquina(maquina: string, dataInicio: Date, dataFim: Date) {
    return prisma.snapshotTurno.findMany({
      where: {
        maquina,
        data: { gte: dataInicio, lte: dataFim },
      },
      include: { produto: true },
      orderBy: [{ data: 'asc' }, { turno: 'asc' }],
    });
  },

  // ── Resumo comparativo por período ────────────
  async resumoPeriodo(dataInicio: Date, dataFim: Date) {
    const rondas = await prisma.ronda.findMany({
      where: { data: { gte: dataInicio, lte: dataFim } },
      include: { detalhesTurnos: true },
      orderBy: { data: 'asc' },
    });

    return rondas.map(r => ({
      data: r.data,
      totalMaquinas: r.totalMaquinas,
      emProducao: r.emProducao,
      produtividadePct: r.totalMaquinas > 0
        ? Math.round((r.emProducao / r.totalMaquinas) * 100)
        : 0,
      divergencias: r.divergencias,
      paradas: r.paradas,
      alertas: r.totalAlertas,
    }));
  },
};

// ── Helpers ───────────────────────────────────

function agruparPorMaquina<T extends { maquina: string; capturadoEm: Date }>(
  snaps: T[]
): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const s of snaps) {
    const existing = mapa.get(s.maquina);
    if (!existing || s.capturadoEm > existing.capturadoEm) {
      mapa.set(s.maquina, s);
    }
  }
  return mapa;
}

function formatarSnapshot(snap: {
  cicloAtual?: number | null;
  cavidadeReal?: number | null;
  status?: string;
  produtoNome?: string | null;
} | undefined | null) {
  if (!snap) return null;
  return {
    produto: snap.produtoNome || '—',
    ciclo: snap.cicloAtual ? `${snap.cicloAtual}s` : '—',
    cavidade: snap.cavidadeReal ?? '—',
    status: snap.status?.replace(/_/g, ' ') || '—',
  };
}

function analisarDiferenca(
  a: { cicloAtual?: number | null; produtoNome?: string | null; status?: string; divergente?: boolean } | null | undefined,
  b: { cicloAtual?: number | null; produtoNome?: string | null; status?: string; divergente?: boolean } | null | undefined
): { descricao: string; tipo: 'ok' | 'info' | 'warning' | 'danger'; alterado: boolean } {
  if (!a && b) return { descricao: 'Nova máquina', tipo: 'info', alterado: true };
  if (a && !b) return { descricao: 'Máquina removida', tipo: 'warning', alterado: true };
  if (!a && !b) return { descricao: '—', tipo: 'ok', alterado: false };

  // Troca de produto
  if (a!.produtoNome && b!.produtoNome && a!.produtoNome !== b!.produtoNome) {
    return { descricao: 'Troca de produto (Novo OP)', tipo: 'info', alterado: true };
  }

  // Mudança de status para parada
  if (!['MANUTENCAO','FERRAMENTARIA'].includes(a!.status || '') &&
       ['MANUTENCAO','FERRAMENTARIA'].includes(b!.status || '')) {
    return { descricao: 'Parada técnica', tipo: 'danger', alterado: true };
  }

  // Ciclo aumentou
  if (a!.cicloAtual && b!.cicloAtual && b!.cicloAtual > a!.cicloAtual) {
    const diff = b!.cicloAtual - a!.cicloAtual;
    return { descricao: `Ciclo aumentou +${diff}s`, tipo: 'warning', alterado: true };
  }

  // Ciclo reduziu
  if (a!.cicloAtual && b!.cicloAtual && b!.cicloAtual < a!.cicloAtual) {
    const diff = a!.cicloAtual - b!.cicloAtual;
    return { descricao: `Ciclo reduziu -${diff}s`, tipo: 'info', alterado: true };
  }

  // Divergência
  if (b!.divergente) {
    return { descricao: 'Divergência detectada', tipo: 'warning', alterado: true };
  }

  return { descricao: 'Normal', tipo: 'ok', alterado: false };
}
