// OPERIS — Service de Alertas (geração automática)

import { prisma } from '../config/database';
import { emitNovoAlerta } from '../config/socket';
import { logger } from '../config/logger';
import { Alerta, AlertaTipo, AlertaSeveridade, SnapshotTurno, Produto } from '@prisma/client';

const alertasService = {
  // ── Divergência de ciclo ou cavidade vs padrão ─
  async gerarAlertasDivergencia(
    snapshot: SnapshotTurno,
    produto: Produto
  ): Promise<void> {
    const alertas: Array<{
      tipo: AlertaTipo;
      severidade: AlertaSeveridade;
      titulo: string;
      descricao: string;
    }> = [];

    // Ciclo acima do padrão
    if (snapshot.cicloAtual !== null && snapshot.cicloAtual > produto.ciclopadrao) {
      const diff = snapshot.cicloAtual - produto.ciclopadrao;
      const pct = Math.round((diff / produto.ciclopadrao) * 100);
      alertas.push({
        tipo: 'CICLO_ACIMA',
        severidade: pct >= 20 ? 'CRITICO' : 'ATENCAO',
        titulo: `Ciclo acima do padrão +${diff}s`,
        descricao: `${snapshot.maquina}: Ciclo atual ${snapshot.cicloAtual}s (padrão ${produto.ciclopadrao}s, +${pct}%)`,
      });
    }

    // Ciclo abaixo do padrão
    if (snapshot.cicloAtual !== null && snapshot.cicloAtual < produto.ciclopadrao * 0.85) {
      const diff = produto.ciclopadrao - snapshot.cicloAtual;
      alertas.push({
        tipo: 'CICLO_ABAIXO',
        severidade: 'ATENCAO',
        titulo: `Ciclo abaixo do padrão -${diff}s`,
        descricao: `${snapshot.maquina}: Ciclo atual ${snapshot.cicloAtual}s (padrão ${produto.ciclopadrao}s)`,
      });
    }

    // Cavidade real abaixo do padrão
    if (snapshot.cavidadeReal !== null && snapshot.cavidadeReal < produto.cavidadepadrao) {
      const diff = produto.cavidadepadrao - snapshot.cavidadeReal;
      alertas.push({
        tipo: 'CAVIDADE_ABAIXO',
        severidade: diff >= 4 ? 'CRITICO' : 'ATENCAO',
        titulo: `Cavidade abaixo do padrão (${snapshot.cavidadeReal}/${produto.cavidadepadrao})`,
        descricao: `${snapshot.maquina}: Cavidade real ${snapshot.cavidadeReal}, padrão ${produto.cavidadepadrao}`,
      });
    }

    for (const alerta of alertas) {
      await this.criarAlerta({ ...alerta, snapshotId: snapshot.id, maquina: snapshot.maquina });
    }
  },

  // ── Alerta de parada técnica ───────────────────
  async gerarAlertaParada(snapshot: SnapshotTurno): Promise<void> {
    // Verifica se já existe alerta recente (evita duplicatas)
    const recente = await prisma.alerta.findFirst({
      where: {
        maquina: snapshot.maquina,
        tipo: 'MAQUINA_PARADA',
        criadoEm: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // últimos 30 min
        lido: false,
      },
    });
    if (recente) return;

    await this.criarAlerta({
      snapshotId: snapshot.id,
      maquina: snapshot.maquina,
      tipo: 'MAQUINA_PARADA',
      severidade: 'CRITICO',
      titulo: `Máquina parada — ${snapshot.status.replace(/_/g, ' ')}`,
      descricao: `${snapshot.maquina} está com status: ${snapshot.status.replace(/_/g, ' ')}`,
    });
  },

  // ── Alerta de troca de produto ─────────────────
  async verificarTrocaProduto(
    maquina: string,
    produtoAtual: string,
    data: Date
  ): Promise<void> {
    // Busca snapshot anterior do dia
    const anterior = await prisma.snapshotTurno.findFirst({
      where: {
        maquina,
        data: { lt: data },
        produtoNome: { not: null },
      },
      orderBy: { data: 'desc' },
    });

    if (anterior?.produtoNome && anterior.produtoNome !== produtoAtual) {
      await this.criarAlerta({
        maquina,
        tipo: 'TROCA_PRODUTO',
        severidade: 'INFO',
        titulo: 'Troca de produto (Novo OP)',
        descricao: `${maquina}: ${anterior.produtoNome} → ${produtoAtual}`,
      });
    }
  },

  // ── Cria alerta no banco + emite socket ────────
  async criarAlerta(params: {
    snapshotId?: string;
    maquina: string;
    tipo: AlertaTipo;
    severidade: AlertaSeveridade;
    titulo: string;
    descricao: string;
  }): Promise<Alerta> {
    const alerta = await prisma.alerta.create({ data: params });
    emitNovoAlerta(alerta);
    logger.info(`🔔 Alerta criado: [${alerta.severidade}] ${alerta.titulo}`);
    return alerta;
  },

  // ── Listar alertas com filtros ────────────────
  async listar(params: {
    lido?: boolean;
    maquina?: string;
    severidade?: AlertaSeveridade;
    tipo?: AlertaTipo;
    page?: number;
    limit?: number;
  }) {
    const { lido, maquina, severidade, tipo, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (lido !== undefined) where.lido = lido;
    if (maquina) where.maquina = maquina;
    if (severidade) where.severidade = severidade;
    if (tipo) where.tipo = tipo;

    const [total, items] = await Promise.all([
      prisma.alerta.count({ where }),
      prisma.alerta.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  },

  // ── Marcar como lido ──────────────────────────
  async marcarLido(id: string): Promise<void> {
    await prisma.alerta.update({ where: { id }, data: { lido: true } });
  },

  // ── Marcar todos como lidos ───────────────────
  async marcarTodosLidos(): Promise<void> {
    await prisma.alerta.updateMany({ where: { lido: false }, data: { lido: true } });
  },

  // ── Deletar alerta ────────────────────────────
  async deletar(id: string): Promise<void> {
    await prisma.alerta.delete({ where: { id } });
  },

  // ── Contagem por severidade (para badges) ─────
  async contarNaoLidos(): Promise<{ total: number; critico: number; atencao: number; info: number }> {
    const [total, critico, atencao, info] = await Promise.all([
      prisma.alerta.count({ where: { lido: false } }),
      prisma.alerta.count({ where: { lido: false, severidade: 'CRITICO' } }),
      prisma.alerta.count({ where: { lido: false, severidade: 'ATENCAO' } }),
      prisma.alerta.count({ where: { lido: false, severidade: 'INFO' } }),
    ]);
    return { total, critico, atencao, info };
  },
};

export { alertasService };
