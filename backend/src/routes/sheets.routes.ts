// OPERIS — Rotas: Google Sheets (sync manual + teste)

import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { executarSync } from '../jobs/scheduler';
import { testarConexao, lerPlanilha, exportarHistoricoParaSheets } from '../services/sheets.service';
import { prisma } from '../config/database';
import { Turno } from '@prisma/client';

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

// POST /api/sheets/exportar-historico
sheetsRouter.post('/exportar-historico', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { data: dataParam, turno: turnoParam, email } = req.body as {
      data?: string; turno?: string; email?: string;
    };

    const data = dataParam ? new Date(dataParam + 'T00:00:00') : new Date();
    data.setHours(0, 0, 0, 0);

    const snaps = await prisma.snapshotTurno.findMany({
      where: { data, ...(turnoParam && turnoParam !== 'TODOS' ? { turno: turnoParam as Turno } : {}) },
      include: { produto: true },
      orderBy: [{ maquina: 'asc' }, { capturadoEm: 'desc' }],
    });

    const map = new Map<string, typeof snaps[0]>();
    for (const s of snaps) {
      const key = `${s.maquina}::${s.turno}`;
      if (!map.has(key) || s.capturadoEm > map.get(key)!.capturadoEm) map.set(key, s);
    }

    const TURNO_LABEL: Record<string,string> = { PRIMEIRO:'1º Turno', SEGUNDO:'2º Turno', TERCEIRO:'3º Turno' };
    const linhas = [...map.values()]
      .sort((a, b) => {
        const na = Number(a.maquina.replace(/\D/g, ''));
        const nb = Number(b.maquina.replace(/\D/g, ''));
        return na - nb || a.turno.localeCompare(b.turno);
      })
      .map((s, i) => {
        const cavPadrao = s.produto?.cavidadepadrao ?? null;
        const cavReal   = s.cavidadeReal;
        return {
          idx:       i + 1,
          maquina:   s.maquina,
          turno:     TURNO_LABEL[s.turno] ?? s.turno,
          op:        s.op,
          descricao: s.produtoNome ?? s.produto?.descricao ?? null,
          qtdOP:     s.qtdOP,
          qtdAtual:  s.qtdAtual,
          ciclo:     s.produto?.ciclopadrao ?? null,
          cicloReal: s.cicloAtual,
          cav:       cavPadrao,
          cavFec:    cavPadrao != null && cavReal != null ? cavPadrao - cavReal : null,
          status:    s.status,
        };
      });

    const dataFmt = data.toLocaleDateString('pt-BR');
    const titulo  = `Histórico OPERIS — ${dataFmt}${turnoParam && turnoParam !== 'TODOS' ? ` (${TURNO_LABEL[turnoParam] ?? turnoParam})` : ''}`;

    const url = await exportarHistoricoParaSheets({ titulo, linhas, emailCompartilhar: email });
    res.json({ url });
  } catch (e) { next(e); }
});
