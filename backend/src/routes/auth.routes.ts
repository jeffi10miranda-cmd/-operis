// OPERIS — Rotas de Autenticação

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { google } from 'googleapis';
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

    if (!user.password) {
      throw new AppError('Faça login utilizando a sua conta do Google.', 401);
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

// ── PATCH /api/auth/profile ───────────────────
authRouter.patch('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = z.object({ name: z.string().min(2).max(80) }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data:  { name },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/change-password ───────────
authRouter.patch('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senhaAtual, novaSenha } = z.object({
      senhaAtual: z.string().min(1),
      novaSenha:  z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    if (!user.password) {
      throw new AppError('Usuários cadastrados via Google não possuem senha para alterar.', 400);
    }

    const match = await bcrypt.compare(senhaAtual, user.password);
    if (!match) throw new AppError('Senha atual incorreta', 400);

    const hashed = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: req.user!.userId }, data: { password: hashed } });
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ──────────────────────
authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  // Com JWT stateless, apenas confirma logout
  res.json({ message: 'Logout realizado com sucesso' });
});

// ── GET /api/auth/google/url ──────────────────
authRouter.get('/google/url', (req: Request, res: Response) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/login`
  );
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
  });
  res.json({ url });
});

// ── POST /api/auth/google/callback ─────────────
authRouter.post('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = z.object({ code: z.string() }).parse(req.body);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/login`
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    if (!data.email) throw new AppError('Email não fornecido pelo Google', 400);

    let user = await prisma.user.findUnique({ where: { email: data.email } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: data.name || 'Usuário Google',
          email: data.email,
          googleId: data.id,
          role: 'OPERADOR',
          active: true,
        }
      });
    } else if (!user.googleId && data.id) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: data.id }
      });
    }

    if (!user.active) throw new AppError('Conta desativada', 401);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as Secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'] }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});
