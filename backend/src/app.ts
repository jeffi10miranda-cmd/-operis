// OPERIS — Configuração Express

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { authRouter } from './routes/auth.routes';
import { produtosRouter } from './routes/produtos.routes';
import { snapshotsRouter } from './routes/snapshots.routes';
import { rondasRouter } from './routes/rondas.routes';
import { alertasRouter } from './routes/alertas.routes';
import { comparativosRouter } from './routes/comparativos.routes';
import { configuracaoRouter } from './routes/configuracao.routes';
import { sheetsRouter } from './routes/sheets.routes';
import { logsRouter } from './routes/logs.routes';
import { statsRouter } from './routes/stats.routes';

export const app = express();

// Render e outros proxies reversos definem X-Forwarded-For
app.set('trust proxy', 1);

// ── Segurança ──────────────────────────────────
app.use(helmet());

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:3002')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origem não permitida — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ──────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});
app.use('/api/', limiter);

// ── Body Parser ────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logs ───────────────────────────────────────
app.use(requestLogger);

// ── Health Check ───────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'OPERIS API', timestamp: new Date().toISOString() });
});

// ── Rotas ──────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/produtos',      produtosRouter);
app.use('/api/snapshots',     snapshotsRouter);
app.use('/api/rondas',        rondasRouter);
app.use('/api/alertas',       alertasRouter);
app.use('/api/comparativos',  comparativosRouter);
app.use('/api/configuracao',  configuracaoRouter);
app.use('/api/sheets',        sheetsRouter);
app.use('/api/logs',          logsRouter);
app.use('/api/stats',         statsRouter);

// ── 404 ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ── Error Handler (deve ser o último middleware) ─
app.use(errorHandler);
