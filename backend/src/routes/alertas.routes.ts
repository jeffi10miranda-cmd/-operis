// OPERIS — Rotas: Alertas

import { Router } from 'express';
import { alertasService } from '../services/alertas.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { AlertaSeveridade, AlertaTipo } from '@prisma/client';

export const alertasRouter = Router();
alertasRouter.use(authenticate);

// GET /api/alertas
alertasRouter.get('/', async (req, res, next) => {
  try {
    const result = await alertasService.listar({
      lido:       req.query.lido !== undefined ? req.query.lido === 'true' : undefined,
      maquina:    req.query.maquina as string | undefined,
      severidade: req.query.severidade as AlertaSeveridade | undefined,
      tipo:       req.query.tipo as AlertaTipo | undefined,
      page:       parseInt(String(req.query.page || 1)),
      limit:      parseInt(String(req.query.limit || 50)),
    });
    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/alertas/contagem
alertasRouter.get('/contagem', async (_req, res, next) => {
  try {
    const contagem = await alertasService.contarNaoLidos();
    res.json(contagem);
  } catch (e) { next(e); }
});

// PATCH /api/alertas/:id/lido
alertasRouter.patch('/:id/lido', async (req, res, next) => {
  try {
    await alertasService.marcarLido(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PATCH /api/alertas/marcar-todos-lidos
alertasRouter.patch('/marcar-todos-lidos', authorize('ADMIN', 'SUPERVISOR'), async (_req, res, next) => {
  try {
    await alertasService.marcarTodosLidos();
    res.json({ ok: true });
  } catch (e) { next(e); }
});
