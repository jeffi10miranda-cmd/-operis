import { Router } from 'express';
import { LogSeveridade } from '@prisma/client';
import { logsService } from '../services/logs.service';
import { authenticate } from '../middlewares/auth.middleware';

export const logsRouter = Router();
logsRouter.use(authenticate);

logsRouter.get('/', async (req, res, next) => {
  try {
    const dataInicio = req.query.dataInicio ? new Date(String(req.query.dataInicio)) : undefined;
    const dataFim = req.query.dataFim ? new Date(String(req.query.dataFim)) : undefined;
    if (dataFim) dataFim.setHours(23, 59, 59, 999);

    const result = await logsService.listar({
      modulo: req.query.modulo as string | undefined,
      severidade: req.query.severidade as LogSeveridade | undefined,
      dataInicio,
      dataFim,
      page: parseInt(String(req.query.page || 1)),
      limit: parseInt(String(req.query.limit || 50)),
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
});
