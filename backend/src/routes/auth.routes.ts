// OPERIS — Rotas de Autenticação

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const registerSchema = z.object({
  name:            z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(80),
  email:           z.string().email('Email inválido'),
  password:        z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

// ── POST /api/auth/login ───────────────────────
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as Secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'] }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/register ───────────────────
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) throw new AppError('Este e-mail já está em uso', 409);

    const hashed = await bcrypt.hash(password, 10);
    const user   = await prisma.user.create({
      data: { name, email, password: hashed, role: 'OPERADOR', active: true },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as Secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'] }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ───────────────────────────
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) throw new AppError('Usuário não encontrado', 404);

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ──────────────────────
authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  // Com JWT stateless, apenas confirma logout
  res.json({ message: 'Logout realizado com sucesso' });
});
