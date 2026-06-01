import { LogSeveridade } from '@prisma/client';
import { prisma } from '../config/database';

export const logsService = {
  async registrar(data: {
    userId?: string;
    modulo: string;
    acao: string;
    descricao: string;
    severidade?: LogSeveridade;
  }) {
    return prisma.operisLog.create({
      data: {
        userId: data.userId,
        modulo: data.modulo,
        acao: data.acao,
        descricao: data.descricao,
        severidade: data.severidade ?? 'INFO',
      },
    });
  },

  async listar(params: {
    modulo?: string;
    severidade?: LogSeveridade;
    dataInicio?: Date;
    dataFim?: Date;
    page?: number;
    limit?: number;
  }) {
    const { modulo, severidade, dataInicio, dataFim, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (modulo) where.modulo = modulo;
    if (severidade) where.severidade = severidade;
    if (dataInicio || dataFim) {
      where.createdAt = {
        ...(dataInicio ? { gte: dataInicio } : {}),
        ...(dataFim ? { lte: dataFim } : {}),
      };
    }

    const [total, items] = await Promise.all([
      prisma.operisLog.count({ where }),
      prisma.operisLog.findMany({
        where,
        include: { usuario: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  },
};
