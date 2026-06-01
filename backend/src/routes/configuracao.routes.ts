// OPERIS — Rotas: Configuração

import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { z } from 'zod';

export const configuracaoRouter = Router();
configuracaoRouter.use(authenticate);

// GET /api/configuracao
configuracaoRouter.get('/', async (_req, res, next) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const mapa: Record<string, string> = {};
    for (const c of configs) mapa[c.chave] = c.valor;
    res.json(mapa);
  } catch (e) { next(e); }
});

// PUT /api/configuracao
configuracaoRouter.put('/', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const schema = z.record(z.string());
    const configs = schema.parse(req.body);

    await prisma.$transaction(
      Object.entries(configs).map(([chave, valor]) =>
        prisma.configuracao.upsert({
          where: { chave },
          create: { chave, valor },
          update: { valor },
        })
      )
    );

    res.json({ ok: true, atualizado: Object.keys(configs).length });
  } catch (e) { next(e); }
});

// GET /api/configuracao/usuarios (lista usuários)
configuracaoRouter.get('/usuarios', authorize('ADMIN'), async (_req, res, next) => {
  try {
    const usuarios = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(usuarios);
  } catch (e) { next(e); }
});

// POST /api/configuracao/usuarios
configuracaoRouter.post('/usuarios', authorize('ADMIN'), async (req, res, next) => {
  try {
    const bcrypt = await import('bcryptjs');
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['ADMIN','SUPERVISOR','OPERADOR','VISUALIZADOR']),
    });
    const data = schema.parse(req.body);
    const hash = await bcrypt.default.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, password: hash },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
});
