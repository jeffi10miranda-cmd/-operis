// OPERIS — Servico de estatisticas historicas para TV/Comparativo

import { prisma } from '../config/database';

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDate(str?: string): Date {
  if (str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return dateOnly(new Date());
}

function nextDay(d: Date): Date {
  return new Date(d.getTime() + 86_400_000);
}

const TURNO_LABEL: Record<string, string> = {
  PRIMEIRO: '1º Turno',
  SEGUNDO:  '2º Turno',
  TERCEIRO: '3º Turno',
};

// Producao por turno (hoje vs ontem)
export async function producaoPorTurno(dataStr?: string) {
  const hoje  = parseDate(dataStr);
  const ontem = new Date(hoje.getTime() - 86_400_000);

  const [snapHoje, snapOntem] = await Promise.all([
    prisma.snapshotTurno.groupBy({
      by: ['turno'],
      where: { data: hoje },
      _sum: { qtdAtual: true },
    }),
    prisma.snapshotTurno.groupBy({
      by: ['turno'],
      where: { data: ontem },
      _sum: { qtdAtual: true },
    }),
  ]);

  const mapaOntem = Object.fromEntries(
    snapOntem.map(s => [s.turno, s._sum.qtdAtual ?? 0]),
  );

  return ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'].map(t => ({
    turno:  TURNO_LABEL[t] ?? t,
    hoje:   snapHoje.find(s => s.turno === t)?._sum.qtdAtual ?? 0,
    ontem:  mapaOntem[t] ?? 0,
  }));
}

// Evolucao do ciclo medio por hora (hoje vs ontem)
export async function cicloEvolucao(dataStr?: string) {
  const hoje   = parseDate(dataStr);
  const ontem  = new Date(hoje.getTime() - 86_400_000);
  const fimHoje  = nextDay(hoje);
  const fimOntem = nextDay(ontem);

  const [snapHoje, snapOntem] = await Promise.all([
    prisma.snapshotTurno.findMany({
      where: { capturadoEm: { gte: hoje, lt: fimHoje }, cicloAtual: { gt: 0 } },
      select: { cicloAtual: true, capturadoEm: true },
    }),
    prisma.snapshotTurno.findMany({
      where: { capturadoEm: { gte: ontem, lt: fimOntem }, cicloAtual: { gt: 0 } },
      select: { cicloAtual: true, capturadoEm: true },
    }),
  ]);

  function agrupar(snaps: { cicloAtual: number | null; capturadoEm: Date }[]) {
    const g: Record<number, number[]> = {};
    for (const s of snaps) {
      if (!s.cicloAtual) continue;
      const h = s.capturadoEm.getUTCHours();
      (g[h] = g[h] ?? []).push(s.cicloAtual);
    }
    return g;
  }

  const gHoje  = agrupar(snapHoje);
  const gOntem = agrupar(snapOntem);

  return Array.from({ length: 24 }, (_, h) => {
    const avgH = gHoje[h]  ? Math.round(gHoje[h].reduce((a,b)=>a+b,0)  / gHoje[h].length)  : null;
    const avgO = gOntem[h] ? Math.round(gOntem[h].reduce((a,b)=>a+b,0) / gOntem[h].length) : null;
    return { t: `${String(h).padStart(2,'0')}h`, hoje: avgH, ontem: avgO };
  }).filter(r => r.hoje !== null || r.ontem !== null);
}
