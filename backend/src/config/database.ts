// OPERIS — Instância Prisma (singleton)

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

logger.info('Prisma client inicializado');

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
