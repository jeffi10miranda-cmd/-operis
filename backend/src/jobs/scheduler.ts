// OPERIS — Agendamentos (node-cron)
// Sincronização automática com Google Sheets

import cron from 'node-cron';
import { Server as SocketServer } from 'socket.io';
import { lerTodosTurnos } from '../services/sheets.service';
import { processarTurno, consolidarRonda } from '../services/snapshots.service';
import { emitSyncStatus } from '../config/socket';
import { logger } from '../config/logger';
import { logsService } from '../services/logs.service';

export function initScheduler(io: SocketServer): void {
  const intervalMin = parseInt(process.env.SYNC_INTERVAL_MINUTES || '1');

  // ── Sincronização das planilhas ────────────────
  // Roda a cada N minutos durante o horário de produção (06:00 - 23:59)
  const syncExpression = `*/${intervalMin} 6-23 * * *`;

  cron.schedule(syncExpression, async () => {
    logger.info('⏰ Iniciando sincronização automática Google Sheets...');
    await executarSync();
  }, { timezone: 'America/Sao_Paulo' });

  // ── Consolidação da ronda (meia-noite) ─────────
  cron.schedule('0 0 * * *', async () => {
    logger.info('📋 Consolidando ronda do dia anterior...');
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    ontem.setHours(0, 0, 0, 0);

    try {
      await consolidarRonda(ontem);
      logger.info('✅ Ronda consolidada com sucesso');
    } catch (err) {
      logger.error('Erro ao consolidar ronda:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  logger.info(`📅 Agendamentos configurados:`);
  logger.info(`   ↳ Sync planilhas: a cada ${intervalMin} min (06h–23h)`);
  logger.info(`   ↳ Consolidação ronda: 00:00 diariamente`);
}

// ── Executa sync manualmente ───────────────────
export async function executarSync(): Promise<{ sucesso: boolean; detalhes: string }> {
  try {
    emitSyncStatus('iniciando');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    logger.info('📥 Lendo planilhas Google Sheets...');
    const { turno1, turno2, turno3 } = await lerTodosTurnos();

    logger.info(`📊 Dados recebidos: T1=${turno1.length} | T2=${turno2.length} | T3=${turno3.length} máquinas`);

    // Processa cada turno em paralelo
    await Promise.all([
      turno1.length > 0 ? processarTurno('turno1', turno1, hoje) : Promise.resolve(),
      turno2.length > 0 ? processarTurno('turno2', turno2, hoje) : Promise.resolve(),
      turno3.length > 0 ? processarTurno('turno3', turno3, hoje) : Promise.resolve(),
    ]);

    // Consolida ronda do dia atual
    await consolidarRonda(hoje);

    const detalhe = `T1: ${turno1.length} | T2: ${turno2.length} | T3: ${turno3.length} máquinas`;
    emitSyncStatus('concluido', detalhe);
    logger.info(`✅ Sync concluído — ${detalhe}`);

    await logsService.registrar({
      modulo: 'SINCRONIZACAO',
      acao: 'SYNC_CONCLUIDO',
      descricao: `Sincronização automática Google Sheets — ${detalhe}`,
      severidade: 'INFO',
    });

    return { sucesso: true, detalhes: detalhe };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    emitSyncStatus('erro', msg);
    logger.error('❌ Erro no sync:', err);

    await logsService.registrar({
      modulo: 'SINCRONIZACAO',
      acao: 'SYNC_ERRO',
      descricao: msg,
      severidade: 'CRITICO',
    });

    return { sucesso: false, detalhes: msg };
  }
}
