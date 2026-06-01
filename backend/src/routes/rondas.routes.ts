// OPERIS — Rotas: Rondas

import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth.middleware';

export const rondasRouter = Router();
rondasRouter.use(authenticate);

// GET /api/rondas?page=1&limit=30
rondasRouter.get('/', async (req, res, next) => {
  try {
    const page  = parseInt(String(req.query.page || 1));
    const limit = parseInt(String(req.query.limit || 30));
    const skip  = (page - 1) * limit;

    const { dataInicio, dataFim } = req.query;

    const where: Record<string, unknown> = {};
    if (dataInicio || dataFim) {
      where.data = {
        ...(dataInicio ? { gte: new Date(String(dataInicio)) } : {}),
        ...(dataFim    ? { lte: new Date(String(dataFim))    } : {}),
      };
    }

    const [total, rondas] = await Promise.all([
      prisma.ronda.count({ where }),
      prisma.ronda.findMany({
        where,
        include: { detalhesTurnos: true },
        orderBy: { data: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({ total, page, limit, items: rondas });
  } catch (e) { next(e); }
});

// GET /api/rondas/hoje
rondasRouter.get('/hoje', async (_req, res, next) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ronda = await prisma.ronda.findUnique({
      where: { data: hoje },
      include: { detalhesTurnos: true },
    });

    res.json(ronda || null);
  } catch (e) { next(e); }
});

// GET /api/rondas/:data (YYYY-MM-DD)
rondasRouter.get('/:data', async (req, res, next) => {
  try {
    const data = new Date(req.params.data);
    data.setHours(0, 0, 0, 0);

    const ronda = await prisma.ronda.findUnique({
      where: { data },
      include: { detalhesTurnos: true },
    });

    if (!ronda) { res.status(404).json({ error: 'Ronda não encontrada' }); return; }
    res.json(ronda);
  } catch (e) { next(e); }
});
