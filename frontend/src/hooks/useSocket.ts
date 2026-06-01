// OPERIS — Hook Socket.io (tempo real)

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { mutate } from 'swr';

let socket: Socket | null = null;

export function useSocket() {
  const connected = useRef(false);

  useEffect(() => {
    if (connected.current) return;

    const token = localStorage.getItem('operis_token');
    if (!token) return;

    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      connected.current = true;
      console.log('[OPERIS] Socket conectado:', socket?.id);
    });

    // Revalida dados na Central quando chega atualização
    socket.on('central:atualizado', () => {
      mutate('/snapshots/hoje');
      mutate('/snapshots/kpis');
    });

    // Revalida alertas quando chega novo alerta
    socket.on('alerta:novo', () => {
      mutate('/alertas');
      mutate('/alertas/contagem');
    });

    // Revalida ronda consolidada
    socket.on('ronda:consolidada', () => {
      mutate('/rondas/hoje');
    });

    socket.on('disconnect', () => {
      connected.current = false;
      console.log('[OPERIS] Socket desconectado');
    });

    return () => {
      socket?.disconnect();
      connected.current = false;
    };
  }, []);

  const joinTurno = useCallback((turno: string) => {
    socket?.emit('join:turno', turno);
  }, []);

  const joinMaquina = useCallback((maquinaId: string) => {
    socket?.emit('join:maquina', maquinaId);
  }, []);

  return { joinTurno, joinMaquina };
}

// Subscrição a eventos específicos (sem hook, para usar em componentes filho)
export function onSyncStatus(
  cb: (data: { status: string; detalhe?: string; timestamp: string }) => void
) {
  socket?.on('sync:status', cb);
  return () => socket?.off('sync:status', cb);
}
