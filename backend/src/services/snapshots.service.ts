// OPERIS — Service de Processamento de Snapshots
// Lógica central: valida produtos, detecta divergências, gera alertas

import { prisma } from '../config/database';
import { SheetRow, mapearStatus } from './sheets.service';
import { alertasService } from './alertas.service';
import { emitSnapshotAtualizado } from '../config/socket';
import { logger } from '../config/logger';
import { Turno, StatusOperacional } from '@prisma/client';

const TURNO_MAP: Record<string, Turno> = {
  turno1: 'PRIMEIRO',
  turno2: 'SEGUNDO',
  turno3: 'TERCEIRO',
};

// ── Processa dados de um turno ─────────────────
export async function processarTurno(
  chave: 'turno1' | 'turno2' | 'turno3',
  rows: SheetRow[],
  data: Date
): Promise<void> {
  const turno = TURNO_MAP[chave];
  logger.info(`Processando ${chave} (${rows.length} máquinas) — ${data.toLocaleDateString('pt-BR')}`);

  for (const row of rows) {
    try {
      await processarMaquina(row, turno, data);
    } catch (err) {
      logger.error(`Erro ao processar máquina ${row.maquina}:`, err);
    }
  }

  // Emite atualização em tempo real
  const snapshots = await prisma.snapshotTurno.findMany({
    where: { data, turno },
    include: { produto: true },
    orderBy: { maquina: 'asc' },
  });

  emitSnapshotAtualizado(chave, snapshots);
  logger.info(`✅ ${chave} processado — ${rows.length} máquinas`);
}

// ── Processa uma máquina individualmente ───────
async function processarMaquina(
  row: SheetRow,
  turno: Turno,
  data: Date
): Promise<void> {
  const statusEnum = mapearStatus(row.status) as StatusOperacional;

  // Busca produto no banco mestre
  const produto = await buscarProduto(row.produto);

  // Detecta divergências em relação ao padrão
  const divergente = produto
    ? detectarDivergencia(row, produto)
    : false;

  // Não sobrescreve snapshot se este turno específico tem override manual ativo
  const hasOverride = await prisma.snapshotTurno.findFirst({
    where: { maquina: row.maquina, data, turno, manualOverride: true },
    select: { id: true },
  });
  if (hasOverride) return;

  // Upsert do snapshot
  const snapshot = await prisma.snapshotTurno.upsert({
    where: {
      data_turno_maquina: { data, turno, maquina: row.maquina },
    },
    create: {
      data,
      turno,
      maquina: row.maquina,
      op: row.op || null,
      produtoId: produto?.id || null,
      produtoNome: row.produto || null,
      qtdOP: row.qtdOP,
      qtdAtual: row.qtdAtual,
      cicloAtual: row.cicloAtual,
      cavidadeReal: row.cavidadeReal,
      velocidade: row.velocidade,
      status: statusEnum,
      observacao: row.observacao || null,
      divergente,
    },
    update: {
      op: row.op || null,
      produtoId: produto?.id || null,
      produtoNome: row.produto || null,
      qtdOP: row.qtdOP,
      qtdAtual: row.qtdAtual,
      cicloAtual: row.cicloAtual,
      cavidadeReal: row.cavidadeReal,
      velocidade: row.velocidade,
      status: statusEnum,
      observacao: row.observacao || null,
      divergente,
    },
  });

  // Gera alertas automáticos se houver divergência
  if (divergente && produto) {
    await alertasService.gerarAlertasDivergencia(snapshot, produto);
  }

  // Alerta para máquinas paradas
  if (['MANUTENCAO', 'FERRAMENTARIA'].includes(statusEnum)) {
    await alertasService.gerarAlertaParada(snapshot);
  }
}

// ── Busca produto no banco mestre ──────────────
async function buscarProduto(nomeProduto: string) {
  if (!nomeProduto) return null;

  // Busca exata primeiro
  let produto = await prisma.produto.findFirst({
    where: { descricao: { equals: nomeProduto, mode: 'insensitive' } },
  });

  // Busca parcial (contém)
  if (!produto) {
    produto = await prisma.produto.findFirst({
      where: { descricao: { contains: nomeProduto, mode: 'insensitive' } },
    });
  }

  return produto;
}

// ── Detecta divergências vs padrão ────────────
function detectarDivergencia(
  row: SheetRow,
  produto: { ciclopadrao: number; cavidadepadrao: number }
): boolean {
  const limiteDesvio = parseFloat(process.env.ALERT_CICLO_DESVIO_PERCENT || '10') / 100;

  // Verifica ciclo
  if (row.cicloAtual !== null) {
    const desvioCiclo = Math.abs(row.cicloAtual - produto.ciclopadrao) / produto.ciclopadrao;
    if (desvioCiclo > limiteDesvio) return true;
  }

  // Verifica cavidade (apenas diminuição em relação ao padrão)
  if (row.cavidadeReal !== null && row.cavidadeReal < produto.cavidadepadrao) {
    return true;
  }

  return false;
}

// ── Consolida ronda do dia ─────────────────────
export async function consolidarRonda(data: Date): Promise<void> {
  logger.info(`Consolidando ronda do dia ${data.toLocaleDateString('pt-BR')}`);

  const snapshots = await prisma.snapshotTurno.findMany({ where: { data } });

  if (snapshots.length === 0) {
    logger.warn('Nenhum snapshot encontrado para consolidar ronda');
    return;
  }

  // Agrupa por máquina (pega último status do dia)
  const maquinas = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    const existing = maquinas.get(s.maquina);
    if (!existing || s.capturadoEm > existing.capturadoEm) {
      maquinas.set(s.maquina, s);
    }
  }

  const total = maquinas.size;
  const contadores = contarStatus([...maquinas.values()]);

  // Upsert ronda
  await prisma.ronda.upsert({
    where: { data },
    create: {
      data,
      totalMaquinas: total,
      ...contadores,
      divergencias: snapshots.filter(s => s.divergente).length,
      totalAlertas: await prisma.alerta.count({
        where: { criadoEm: { gte: startOfDay(data), lte: endOfDay(data) } },
      }),
    },
    update: {
      totalMaquinas: total,
      ...contadores,
      divergencias: snapshots.filter(s => s.divergente).length,
      totalAlertas: await prisma.alerta.count({
        where: { criadoEm: { gte: startOfDay(data), lte: endOfDay(data) } },
      }),
    },
  });

  // Detalhes por turno
  for (const turno of ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO'] as Turno[]) {
    const turnoSnaps = snapshots.filter(s => s.turno === turno);
    if (turnoSnaps.length === 0) continue;

    const maqTurno = new Map<string, typeof snapshots[0]>();
    for (const s of turnoSnaps) {
      const ex = maqTurno.get(s.maquina);
      if (!ex || s.capturadoEm > ex.capturadoEm) maqTurno.set(s.maquina, s);
    }

    const cont = contarStatus([...maqTurno.values()]);
    const ronda = await prisma.ronda.findUnique({ where: { data } });
    if (!ronda) continue;

    await prisma.rondaTurno.upsert({
      where: { rondaId_turno: { rondaId: ronda.id, turno } },
      create: { rondaId: ronda.id, turno, totalMaquinas: maqTurno.size, ...cont },
      update: { totalMaquinas: maqTurno.size, ...cont },
    });
  }

  logger.info(`✅ Ronda consolidada: ${total} máquinas`);
}

// ── Helpers ───────────────────────────────────
function contarStatus(snaps: Array<{ status: StatusOperacional }>) {
  return {
    emProducao:  snaps.filter(s => s.status === 'EM_PRODUCAO').length,
    emSetup:     snaps.filter(s => ['SETUP','SETUP_DE_COR','FORA_DA_COR_PADRAO'].includes(s.status)).length,
    emRegulagem: snaps.filter(s => s.status === 'REGULAGEM').length,
    aguardando:  snaps.filter(s => s.status.startsWith('AGUARDANDO')).length,
    paradas:     snaps.filter(s => ['MANUTENCAO','FERRAMENTARIA'].includes(s.status)).length,
    inativas:    snaps.filter(s => s.status === 'INATIVA').length,
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
