// OPERIS — Rotas: Produtos

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';

export const produtosRouter = Router();
produtosRouter.use(authenticate);

const produtoSchema = z.object({
  codigo:          z.string().min(1),
  descricao:       z.string().min(1),
  ciclopadrao:     z.number().int().positive(),
  cavidadepadrao:  z.number().int().positive(),
});

// GET /api/produtos
produtosRouter.get('/', async (_req, res, next) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { descricao: 'asc' },
    });
    res.json(produtos);
  } catch (e) { next(e); }
});

// GET /api/produtos/buscar?q=...
produtosRouter.get('/buscar', async (req, res, next) => {
  try {
    const q = String(req.query.q || '');
    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        OR: [
          { descricao: { contains: q, mode: 'insensitive' } },
          { codigo: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    res.json(produtos);
  } catch (e) { next(e); }
});

// POST /api/produtos
produtosRouter.post('/', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const data = produtoSchema.parse(req.body);
    const produto = await prisma.produto.create({ data });
    res.status(201).json(produto);
  } catch (e) { next(e); }
});

// PUT /api/produtos/:id
produtosRouter.put('/:id', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const data = produtoSchema.partial().parse(req.body);
    const produto = await prisma.produto.update({ where: { id: req.params.id }, data });
    res.json(produto);
  } catch (e) { next(e); }
});

// DELETE /api/produtos/:id (soft delete)
produtosRouter.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.produto.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.status(204).send();
  } catch (e) { next(e); }
});
