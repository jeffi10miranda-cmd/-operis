// OPERIS — Serviço de estatísticas históricas para TV/Comparativo

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

const TURNO_LABEL: Record<string, string> = {
  PRIMEIRO: '1º Turno',
  SEGUNDO:  '2º Turno',
  TERCEIRO: '3º Turno',
};

// ── Produção por turno (hoje vs ontem) ─────────
export async function producaoPorTurno(dataStr?: string) {
  const hoje  = parseDate(dataStr);
  const ontem = new Date(hoje.getTime() - 86_400_000);

  const [snapHoje, snapOntem] = await Promise.all([
    prisma.snapshotTurno.groupBy({
      by: ['turno'],
      where: { data: hoje, qtdAtual: { not: null } },
      _sum: { qtdAtual: true },
      orderBy: { turno: 'asc' },
    }),
    prisma.snapshotTurno.groupBy({
      by: ['turno'],
      where: { data: ontem, qtdAtual: { not: null } },
      _sum: { qtdAtual: true },
      orderBy: { turno: 'asc' },
    }),
  ]);

  const mapaOntem = Object.fromEntries(
    snapOntem.map(s => [s.turno, s._sum.qtdAtual ?? 0]),
  );

  const turnos = ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'];
  return turnos.map(t => ({
    turno:  TURNO_LABEL[t] ?? t,
    hoje:   snapHoje.find(s => s.turno === t)?._sum.qtdAtual ?? 0,
    ontem:  mapaOntem[t] ?? 0,
  }));
}

// ── Evolução do ciclo médio por hora (hoje vs ontem) ──
export async function cicloEvolucao(dataStr?: string) {
  const hoje  = parseDate(dataStr);
  const ontem = new Date(hoje.getTime() - 86_400_000);

  const amanhã = new Date(hoje.getTime() + 86_400_000);
  const depoisDeOntem = new Date(ontem.getTime() + 86_400_000);

  const [snapHoje, snapOntem] = await Promise.all([
    prisma.snapshotTurno.findMany({
      where: {
        capturadoEm: { gte: hoje, lt: amanhã },
        cicloAtual:  { not: null, gt: 0 },
      },
      select: { cicloAtual: true, capturadoEm: true },
    }),
    prisma.snapshotTurno.findMany({
      where: {
        capturadoEm: { gte: ontem, lt: depoisDeOntem },
        cicloAtual:  { not: null, gt: 0 },
      },
      select: { cicloAtual: true, capturadoEm: true },
    }),
  ]);

  function agruparPorHora(snaps: { cicloAtual: number | null; capturadoEm: Date }[]) {
    const grupos: Record<number, number[]> = {};
    for (const s of snaps) {
      if (!s.cicloAtual) continue;
      const h = s.capturadoEm.getUTCHours();
      if (!grupos[h]) grupos[h] = [];
      grupos[h].push(s.cicloAtual);
    }
    return grupos;
  }

  const gruposHoje  = agruparPorHora(snapHoje);
  const gruposOntem = agruparPorHora(snapOntem);

  const horas = Array.from({ length: 24 }, (_, i) => i);
  const resultado = horas
    .map(h => {
      const avgHoje  = gruposHoje[h]  ? Math.round(gruposHoje[h].reduce((a,b)=>a+b,0)  / gruposHoje[h].length)  : null;
      const avgOntem = gruposOntem[h] ? Math.round(gruposOntem[h].reduce((a,b)=>a+b,0) / gruposOntem[h].length) : null;
      return { t: `${String(h).padStart(2,'0')}h`, hoje: avgHoje, ontem: avgOntem };
    })
    .filter(r => r.hoje !== null || r.ontem !== null);

  return resultado;
}
