// OPERIS — Servidor Principal
// Node.js + Express + Socket.io

import 'dotenv/config';
import http from 'http';
import { app } from './app';
import { initSocketServer } from './config/socket';
import { initScheduler } from './jobs/scheduler';
import { logger } from './config/logger';
import { prisma } from './config/database';

const PORT = process.env.PORT || 3003;

async function bootstrap() {
  try {
    // Testa conexão com banco
    await prisma.$connect();
    logger.info('✅ PostgreSQL conectado');

    // Cria servidor HTTP
    const httpServer = http.createServer(app);

    // Inicializa Socket.io
    const io = initSocketServer(httpServer);
    logger.info('✅ Socket.io inicializado');

    // Inicia agendamentos (sync Google Sheets)
    initScheduler(io);
    logger.info('✅ Agendamentos iniciados');

    // Inicia servidor
    httpServer.listen(PORT, () => {
      logger.info(`🚀 OPERIS Backend rodando na porta ${PORT}`);
      logger.info(`📊 Ambiente: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM recebido. Encerrando servidor...');
      await prisma.$disconnect();
      httpServer.close(() => process.exit(0));
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT recebido. Encerrando servidor...');
      await prisma.$disconnect();
      httpServer.close(() => process.exit(0));
    });

  } catch (error) {
    logger.error('Erro fatal ao inicializar servidor:', error);
    process.exit(1);
  }
}

bootstrap();
