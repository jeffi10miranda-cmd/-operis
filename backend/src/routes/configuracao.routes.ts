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

// POST /api/configuracao/teste-email
configuracaoRouter.post('/teste-email', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);
    const { sendEmail } = await import('../services/email.service');
    
    await sendEmail({
      to,
      subject: 'OPERIS - Teste de Integração de E-mail',
      html: '<h3>Teste bem-sucedido!</h3><p>A configuração SMTP do sistema Operis está funcionando perfeitamente.</p>',
    });

    res.json({ ok: true, message: 'E-mail de teste enviado com sucesso!' });
  } catch (e) { next(e); }
});

// GET /api/configuracao/usuarios (lista usuários)
configuracaoRouter.get('/usuarios', authorize('ADMIN', 'SUPERVISOR'), async (_req, res, next) => {
  try {
    const usuarios = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(usuarios);
  } catch (e) { next(e); }
});

// PATCH /api/configuracao/usuarios/:id/role
configuracaoRouter.patch('/usuarios/:id/role', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { role } = z.object({
      role: z.enum(['ADMIN','SUPERVISOR','OPERADOR','VISUALIZADOR']),
    }).parse(req.body);

    const solicitante = req.user!;
    const alvo = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
    if (!alvo) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    // Admin não pode se rebaixar
    if (alvo.id === solicitante.userId) {
      res.status(400).json({ error: 'Você não pode alterar seu próprio perfil.' }); return;
    }

    // Supervisor não pode tocar em admins
    if (solicitante.role === 'SUPERVISOR' && (alvo.role === 'ADMIN' || role === 'ADMIN')) {
      res.status(403).json({ error: 'Supervisores não podem alterar o perfil de administradores.' }); return;
    }

    const user = await prisma.user.update({
      where:  { id: req.params.id },
      data:   { role },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(user);
  } catch (e) { next(e); }
});

// DELETE /api/configuracao/usuarios/:id
configuracaoRouter.delete('/usuarios/:id', authorize('ADMIN', 'SUPERVISOR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const solicitante = req.user!;

    if (id === solicitante.userId) {
      res.status(400).json({ error: 'Você não pode excluir sua própria conta.' }); return;
    }

    const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!alvo) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    // Supervisor não pode excluir admin
    if (solicitante.role === 'SUPERVISOR' && alvo.role === 'ADMIN') {
      res.status(403).json({ error: 'Supervisores não podem excluir administradores.' }); return;
    }

    await prisma.$transaction([
      prisma.alerta.updateMany({ where: { criadoPor: id }, data: { criadoPor: null } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ ok: true });
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

// DELETE /api/configuracao/limpar-dados
configuracaoRouter.delete('/limpar-dados', authorize('ADMIN'), async (req, res, next) => {
  try {
    // Apaga dados operacionais. A ordem de exclusão deve respeitar chaves estrangeiras se houver, 
    // mas Prisma lida bem com deletes independentes se não houver FK restrita (Snapshot e Alerta tem FK, então apaga alerta primeiro)
    await prisma.alerta.deleteMany();
    await prisma.snapshotTurno.deleteMany();
    await prisma.rondaTurno.deleteMany();
    await prisma.ronda.deleteMany();
    await prisma.operisLog.deleteMany();
    
    res.json({ ok: true, message: 'Dados operacionais removidos com sucesso.' });
  } catch (e) { next(e); }
});
