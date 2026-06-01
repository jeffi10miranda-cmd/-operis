// OPERIS — Rotas: Google Sheets (sync manual + teste)

import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { executarSync } from '../jobs/scheduler';
import { testarConexao, lerPlanilha } from '../services/sheets.service';

export const sheetsRouter = Router();
sheetsRouter.use(authenticate);

// POST /api/sheets/sincronizar (dispara sync manual)
sheetsRouter.post('/sincronizar', authorize('ADMIN', 'SUPERVISOR'), async (_req, res, next) => {
  try {
    const resultado = await executarSync();
    res.json(resultado);
  } catch (e) { next(e); }
});

// POST /api/sheets/testar-conexao
sheetsRouter.post('/testar-conexao', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { sheetId } = req.body as { sheetId: string };
    if (!sheetId) { res.status(400).json({ error: 'sheetId obrigatório' }); return; }

    const ok = await testarConexao(sheetId);
    res.json({ conectado: ok, sheetId });
  } catch (e) { next(e); }
});

// GET /api/sheets/preview/:turno (preview dos dados brutos)
sheetsRouter.get('/preview/:turno', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const turnoMap: Record<string, string | undefined> = {
      '1': process.env.SHEET_ID_TURNO_1,
      '2': process.env.SHEET_ID_TURNO_2,
      '3': process.env.SHEET_ID_TURNO_3,
    };

    const sheetId = turnoMap[req.params.turno];
    if (!sheetId) { res.status(400).json({ error: 'Turno inválido (1, 2 ou 3)' }); return; }

    const rows = await lerPlanilha(sheetId);
    res.json({ turno: req.params.turno, totalLinhas: rows.length, preview: rows.slice(0, 5) });
  } catch (e) { next(e); }
});
