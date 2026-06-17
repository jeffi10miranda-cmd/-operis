// OPERIS — Rotas: Comparativos

import { Router } from 'express';
import { comparativosService } from '../services/comparativos.service';
import { authenticate } from '../middlewares/auth.middleware';

export const comparativosRouter = Router();
comparativosRouter.use(authenticate);

// GET /api/comparativos/dias?dataA=YYYY-MM-DD&dataB=YYYY-MM-DD
comparativosRouter.get('/dias', async (req, res, next) => {
  try {
    const dataA = new Date(String(req.query.dataA));
    const dataB = new Date(String(req.query.dataB));
    dataA.setHours(0,0,0,0);
    dataB.setHours(0,0,0,0);

    const maquina = req.query.maquina as string | undefined;
    const resultado = await comparativosService.compararDias(dataA, dataB, { maquina });

    const apenasAlteracoes = req.query.somenteAlteracoes === 'true';
    res.json(apenasAlteracoes ? resultado.filter(r => r.alterado) : resultado);
  } catch (e) { next(e); }
});

// GET /api/comparativos/turnos?data=YYYY-MM-DD
comparativosRouter.get('/turnos', async (req, res, next) => {
  try {
    const data = new Date(String(req.query.data));
    data.setHours(0,0,0,0);
    const resultado = await comparativosService.compararTurnos(data);
    res.json(resultado);
  } catch (e) { next(e); }
});

// GET /api/comparativos/periodo?dataInicio=...&dataFim=...
comparativosRouter.get('/periodo', async (req, res, next) => {
  try {
    const dataInicio = new Date(String(req.query.dataInicio));
    const dataFim    = new Date(String(req.query.dataFim));
    const resultado  = await comparativosService.resumoPeriodo(dataInicio, dataFim);
    res.json(resultado);
  } catch (e) { next(e); }
});

// GET /api/comparativos/maquina/:id?dataInicio=...&dataFim=...
comparativosRouter.get('/maquina/:id', async (req, res, next) => {
  try {
    const dataInicio = new Date(String(req.query.dataInicio));
    const dataFim    = new Date(String(req.query.dataFim));
    const resultado  = await comparativosService.evolucaoMaquina(req.params.id, dataInicio, dataFim);
    res.json(resultado);
  } catch (e) { next(e); }
});

// GET /api/comparativos/kpis?dataA=...&dataB=...
comparativosRouter.get('/kpis', async (req, res, next) => {
  try {
    const dataA = new Date(String(req.query.dataA));
    const dataB = new Date(String(req.query.dataB));
    dataA.setHours(0,0,0,0);
    dataB.setHours(0,0,0,0);
    const resultado = await comparativosService.calcularKpisPeriodo(dataA, dataB);
    res.json(resultado);
  } catch (e) { next(e); }
});

// GET /api/comparativos/graficos?dataA=...&dataB=...
comparativosRouter.get('/graficos', async (req, res, next) => {
  try {
    const dataA = new Date(String(req.query.dataA));
    const dataB = new Date(String(req.query.dataB));
    dataA.setHours(0,0,0,0);
    dataB.setHours(0,0,0,0);
    const resultado = await comparativosService.calcularGraficosPeriodo(dataA, dataB);
    res.json(resultado);
  } catch (e) { next(e); }
});
