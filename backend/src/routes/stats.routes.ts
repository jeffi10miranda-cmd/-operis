// OPERIS — Rotas de estatísticas históricas (TV/Comparativo)

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { producaoPorTurno, cicloEvolucao } from '../services/stats.service';

export const statsRouter = Router();
statsRouter.use(authenticate);

// GET /api/stats/producao-turno?data=2026-06-02
statsRouter.get('/producao-turno', async (req, res, next) => {
  try {
    const data = req.query.data as string | undefined;
    res.json(await producaoPorTurno(data));
  } catch (e) { next(e); }
});

// GET /api/stats/ciclo-evolucao?data=2026-06-02
statsRouter.get('/ciclo-evolucao', async (req, res, next) => {
  try {
    const data = req.query.data as string | undefined;
    res.json(await cicloEvolucao(data));
  } catch (e) { next(e); }
});
