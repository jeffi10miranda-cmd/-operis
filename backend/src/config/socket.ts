// OPERIS — Socket.io (tempo real)

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from './logger';

let io: SocketServer;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3002',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket conectado: ${socket.id}`);

    // Entrar na sala de um turno específico
    socket.on('join:turno', (turno: string) => {
      socket.join(`turno:${turno}`);
      logger.debug(`Socket ${socket.id} entrou em turno:${turno}`);
    });

    // Entrar na sala de uma máquina específica
    socket.on('join:maquina', (maquinaId: string) => {
      socket.join(`maquina:${maquinaId}`);
      logger.debug(`Socket ${socket.id} monitorando maquina:${maquinaId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io não inicializado');
  return io;
}

// ── Eventos emitidos pelo backend ─────────────

// Novo snapshot de turno processado
export function emitSnapshotAtualizado(turno: string, data: unknown) {
  getIO().to(`turno:${turno}`).emit('snapshot:atualizado', data);
  getIO().emit('central:atualizado', data); // todos os clientes na Central
}

// Novo alerta gerado
export function emitNovoAlerta(alerta: unknown) {
  getIO().emit('alerta:novo', alerta);
}

// Ronda do dia consolidada
export function emitRondaConsolidada(ronda: unknown) {
  getIO().emit('ronda:consolidada', ronda);
}

// Status de sincronização Google Sheets
export function emitSyncStatus(status: 'iniciando' | 'concluido' | 'erro', detalhe?: string) {
  getIO().emit('sync:status', { status, detalhe, timestamp: new Date().toISOString() });
}
