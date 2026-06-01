// OPERIS — Seed do banco de dados

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRODUTOS_MESTRE: { codigo: string; descricao: string; ciclopadrao: number; cavidadepadrao: number }[] = [
  { codigo: 'P001', descricao: 'Frasco reto 12', ciclopadrao: 50, cavidadepadrao: 24 },
  { codigo: 'P002', descricao: 'Haste 48 mm', ciclopadrao: 30, cavidadepadrao: 32 },
  { codigo: 'P003', descricao: 'Peneira - Rosa', ciclopadrao: 22, cavidadepadrao: 16 },
  { codigo: 'P004', descricao: 'Tampa Kelly - Preto', ciclopadrao: 20, cavidadepadrao: 16 },
  { codigo: 'P005', descricao: 'Haste 31mm BT - Cinza', ciclopadrao: 20, cavidadepadrao: 32 },
  { codigo: 'P006', descricao: 'Tampa Cibeli C/R - Preto', ciclopadrao: 24, cavidadepadrao: 16 },
  { codigo: 'P007', descricao: 'Tampa Cibeli - Amarelo', ciclopadrao: 24, cavidadepadrao: 32 },
  { codigo: 'P008', descricao: 'Tampa Stick XL - Branco', ciclopadrao: 25, cavidadepadrao: 16 },
  { codigo: 'P009', descricao: 'Haste 55mm - Preto', ciclopadrao: 30, cavidadepadrao: 32 },
  { codigo: 'P010', descricao: 'Base Stick XL - Azul', ciclopadrao: 25, cavidadepadrao: 16 },
  { codigo: 'P011', descricao: 'Haste Flat 34,20 mm', ciclopadrao: 30, cavidadepadrao: 128 },
  { codigo: 'P012', descricao: 'Tampa Novo Toque - Branco', ciclopadrao: 23, cavidadepadrao: 32 },
  { codigo: 'P013', descricao: 'Haste 67mm c/adaptador', ciclopadrao: 35, cavidadepadrao: 32 },
  { codigo: 'P014', descricao: 'Corpo Stick XL - Nude', ciclopadrao: 25, cavidadepadrao: 16 },
  { codigo: 'P015', descricao: 'Frasco reto 03', ciclopadrao: 55, cavidadepadrao: 24 },
  { codigo: 'P016', descricao: 'Frasco reto 05', ciclopadrao: 55, cavidadepadrao: 24 },
  { codigo: 'P017', descricao: 'Frasco reto 05 - Marrom', ciclopadrao: 55, cavidadepadrao: 16 },
  { codigo: 'P018', descricao: 'Pote', ciclopadrao: 50, cavidadepadrao: 16 },
  { codigo: 'P019', descricao: 'Frasco reto 10 - Marrom', ciclopadrao: 50, cavidadepadrao: 24 },
  { codigo: 'P020', descricao: 'Tampa Verônica - Preto', ciclopadrao: 34, cavidadepadrao: 32 },
  { codigo: 'P021', descricao: 'Batoque BL 02 - Laranja', ciclopadrao: 25, cavidadepadrao: 32 },
  { codigo: 'P022', descricao: 'Haste 80mm c/adaptador - Preto', ciclopadrao: 35, cavidadepadrao: 32 },
  { codigo: 'P023', descricao: 'Batoque BL 03 Cônico', ciclopadrao: 15, cavidadepadrao: 16 },
  { codigo: 'P024', descricao: 'Frasco reto 06', ciclopadrao: 50, cavidadepadrao: 24 },
  { codigo: 'P025', descricao: 'Tampa Impala - Branco', ciclopadrao: 16, cavidadepadrao: 24 },
  { codigo: 'P026', descricao: 'Haste 38mm Redonda', ciclopadrao: 30, cavidadepadrao: 128 },
  { codigo: 'P027', descricao: 'Tampa Amanda - Salmão', ciclopadrao: 15, cavidadepadrao: 32 },
  { codigo: 'P028', descricao: 'Trava da Peneira C/R', ciclopadrao: 25, cavidadepadrao: 32 },
  { codigo: 'P029', descricao: 'Tampa Cibeli C/R Fosca', ciclopadrao: 20, cavidadepadrao: 16 },
  { codigo: 'P030', descricao: 'Tampa Brilho Roll-on', ciclopadrao: 25, cavidadepadrao: 16 },
  { codigo: 'P031', descricao: 'Caneca Stick XL', ciclopadrao: 20, cavidadepadrao: 32 },
  { codigo: 'P032', descricao: 'Frasco reto 10 6ML', ciclopadrao: 25, cavidadepadrao: 16 },
  { codigo: 'P033', descricao: 'Batoque BL 03', ciclopadrao: 50, cavidadepadrao: 24 },
  { codigo: 'P034', descricao: 'Frasco reto 06 - Amarelo', ciclopadrao: 30, cavidadepadrao: 32 },
  { codigo: 'P035', descricao: 'Batoque BL 02', ciclopadrao: 50, cavidadepadrao: 24 },
  { codigo: 'P036', descricao: 'Haste 31mm Flat', ciclopadrao: 25, cavidadepadrao: 32 },
  { codigo: 'P037', descricao: 'Batoque BL 03 - Preto', ciclopadrao: 30, cavidadepadrao: 128 },
  { codigo: 'P038', descricao: 'Tampa Stick XL - Marrom', ciclopadrao: 30, cavidadepadrao: 32 },
  { codigo: 'P039', descricao: 'Tampa Cibeli - Rosa', ciclopadrao: 25, cavidadepadrao: 16 },
  { codigo: 'P040', descricao: 'Haste 31mm BT - Branco', ciclopadrao: 24, cavidadepadrao: 16 },
  { codigo: 'P041', descricao: 'Tampa Amanda - Rosa', ciclopadrao: 20, cavidadepadrao: 16 },
  { codigo: 'P042', descricao: 'Peneira - Verde', ciclopadrao: 25, cavidadepadrao: 24 },
];

async function main() {
  console.log('🌱 Iniciando seed do OPERIS...');

  const adminHash = await bcrypt.hash('operis@2025', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@operis.com.br' },
    create: {
      name: 'Administrador OPERIS',
      email: 'admin@operis.com.br',
      password: adminHash,
      role: 'ADMIN',
    },
    update: {},
  });
  console.log(`✅ Admin: ${admin.email}`);

  const supervisorHash = await bcrypt.hash('supervisor@2025', 10);
  await prisma.user.upsert({
    where: { email: 'supervisor@operis.com.br' },
    create: {
      name: 'Supervisor Operacional',
      email: 'supervisor@operis.com.br',
      password: supervisorHash,
      role: 'SUPERVISOR',
    },
    update: {},
  });

  for (const p of PRODUTOS_MESTRE) {
    await prisma.produto.upsert({
      where: { codigo: p.codigo },
      create: p,
      update: { descricao: p.descricao, ciclopadrao: p.ciclopadrao, cavidadepadrao: p.cavidadepadrao },
    });
  }
  console.log(`✅ ${PRODUTOS_MESTRE.length} produtos no banco mestre`);

  const configs = [
    { chave: 'sync_interval_minutos', valor: '1' },
    { chave: 'alert_ciclo_desvio_pct', valor: '10' },
    { chave: 'alert_setup_max_minutos', valor: '60' },
    { chave: 'alert_cavidade_min_diff', valor: '1' },
    { chave: 'tema_padrao', valor: 'industrial' },
    { chave: 'turno_1_inicio', valor: '06:00' },
    { chave: 'turno_1_fim', valor: '14:00' },
    { chave: 'turno_2_inicio', valor: '14:00' },
    { chave: 'turno_2_fim', valor: '22:00' },
    { chave: 'turno_3_inicio', valor: '22:00' },
    { chave: 'turno_3_fim', valor: '06:00' },
  ];

  for (const c of configs) {
    await prisma.configuracao.upsert({
      where: { chave: c.chave },
      create: c,
      update: { valor: c.valor },
    });
  }

  const integracoes = [
    { nome: '1º Turno', urlGoogleSheet: process.env.SHEET_ID_TURNO_1 || '' },
    { nome: '2º Turno', urlGoogleSheet: process.env.SHEET_ID_TURNO_2 || '' },
    { nome: '3º Turno', urlGoogleSheet: process.env.SHEET_ID_TURNO_3 || '' },
  ];

  for (const item of integracoes) {
    const existing = await prisma.integracao.findFirst({ where: { nome: item.nome } });
    if (existing) {
      await prisma.integracao.update({
        where: { id: existing.id },
        data: { urlGoogleSheet: item.urlGoogleSheet, ativo: Boolean(item.urlGoogleSheet) },
      });
    } else {
      await prisma.integracao.create({ data: item });
    }
  }

  await logsServiceSafe('SISTEMA', 'SEED', 'Banco de dados inicializado com produtos mestre e configurações.', 'INFO');

  console.log('\n🎉 Seed concluído!');
  console.log('   Login: admin@operis.com.br / operis@2025');
}

async function logsServiceSafe(modulo: string, acao: string, descricao: string, severidade: 'INFO' | 'ATENCAO' | 'CRITICO') {
  try {
    await prisma.operisLog.create({ data: { modulo, acao, descricao, severidade } });
  } catch {
    // Tabela logs pode ainda não existir antes da migration
  }
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
