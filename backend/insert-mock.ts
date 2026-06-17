import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const snapshots = [
    { maquina: 'MÁQ 01', produtoNome: 'Frasco reto 12', cicloAtual: 50, cavidadeReal: 24, velocidade: 120, status: 'EM_PRODUCAO' as const, turno: 'PRIMEIRO' as const, data: hoje },
    { maquina: 'MÁQ 02', produtoNome: 'Tampa Kelly', cicloAtual: 20, cavidadeReal: 16, velocidade: 110, status: 'SETUP' as const, turno: 'PRIMEIRO' as const, data: hoje },
    { maquina: 'MÁQ 03', produtoNome: 'Haste 48 mm', cicloAtual: 30, cavidadeReal: 32, velocidade: 95, status: 'REGULAGEM' as const, turno: 'PRIMEIRO' as const, divergente: true, data: hoje },
    { maquina: 'MÁQ 04', produtoNome: 'Tampa Stick XL', cicloAtual: 25, cavidadeReal: 16, velocidade: 100, status: 'EM_PRODUCAO' as const, turno: 'SEGUNDO' as const, data: hoje },
    { maquina: 'MÁQ 05', produtoNome: 'Base Stick', cicloAtual: 20, cavidadeReal: 32, velocidade: 100, status: 'PARADA_PLANEJADA' as const, turno: 'SEGUNDO' as const, data: hoje },
    { maquina: 'MÁQ 06', produtoNome: 'Peneira', cicloAtual: 15, cavidadeReal: 16, velocidade: 100, status: 'EM_PRODUCAO' as const, turno: 'TERCEIRO' as const, data: hoje },
  ];

  console.log('Inserindo snapshots mock...');
  for (const s of snapshots) {
    await prisma.snapshotTurno.upsert({
      where: { data_turno_maquina: { data: s.data, turno: s.turno, maquina: s.maquina } },
      update: s,
      create: s,
    });
  }
  console.log('Pronto! Snaphots de teste inseridos para hoje.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
