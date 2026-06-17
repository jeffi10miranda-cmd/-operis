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
    // Busca limites configurados no banco
    const cfgDesvio = await prisma.configuracao.findUnique({ where: { chave: 'alert_ciclo_desvio_pct' } });
    const cfgCav    = await prisma.configuracao.findUnique({ where: { chave: 'alert_cavidades_config' } });
    const desvioFator = parseFloat(cfgDesvio?.valor ?? '10') / 100;
    // cavConfig: { "4": 2, "8": 2, ... } → molde de N cav: X fechadas = CRÍTICO
    const cavConfig: Record<string, number> = cfgCav?.valor
      ? (() => { try { return JSON.parse(cfgCav.valor); } catch { return {}; } })()
      : { '4':2,'8':2,'16':4,'24':4,'32':8,'48':8,'64':16,'128':32 };

    const alertas: Array<{
      tipo: AlertaTipo;
      severidade: AlertaSeveridade;
      titulo: string;
      descricao: string;
    }> = [];

    // Ciclo acima do padrão (usa threshold configurado)
    if (snapshot.cicloAtual !== null && snapshot.cicloAtual > produto.ciclopadrao * (1 + desvioFator)) {
      const diff = snapshot.cicloAtual - produto.ciclopadrao;
      const pct = Math.round((diff / produto.ciclopadrao) * 100);
      alertas.push({
        tipo: 'CICLO_ACIMA',
        severidade: pct >= 20 ? 'CRITICO' : 'ATENCAO',
        titulo: `Ciclo acima do padrão +${diff}s`,
        descricao: `${snapshot.maquina}: Ciclo atual ${snapshot.cicloAtual}s (padrão ${produto.ciclopadrao}s, +${pct}%)`,
      });
    }

    // Ciclo abaixo do padrão (usa mesmo threshold configurado, simétrico)
    if (snapshot.cicloAtual !== null && snapshot.cicloAtual < produto.ciclopadrao * (1 - desvioFator)) {
      const diff = produto.ciclopadrao - snapshot.cicloAtual;
      const pct = Math.round((diff / produto.ciclopadrao) * 100);
      alertas.push({
        tipo: 'CICLO_ABAIXO',
        severidade: pct >= 20 ? 'CRITICO' : 'ATENCAO',
        titulo: `Ciclo abaixo do padrão -${diff}s`,
        descricao: `${snapshot.maquina}: Ciclo atual ${snapshot.cicloAtual}s (padrão ${produto.ciclopadrao}s, -${pct}%)`,
      });
    }

    // Cavidade real abaixo do padrão (qualquer diminuição gera alerta)
    if (snapshot.cavidadeReal !== null && snapshot.cavidadeReal < produto.cavidadepadrao) {
      const fechadas  = produto.cavidadepadrao - snapshot.cavidadeReal;
      const limiar    = cavConfig[String(produto.cavidadepadrao)] ?? 1;
      // CRÍTICO se fechou >= limiar configurado para este tamanho de molde
      const isCritico = fechadas >= limiar;
      alertas.push({
        tipo: 'CAVIDADE_ABAIXO',
        severidade: isCritico ? 'CRITICO' : 'ATENCAO',
        titulo: `Cavidade abaixo do padrão (${snapshot.cavidadeReal}/${produto.cavidadepadrao})`,
        descricao: `${snapshot.maquina}: ${fechadas} cavidade${fechadas !== 1 ? 's' : ''} fechada${fechadas !== 1 ? 's' : ''} — real ${snapshot.cavidadeReal}, padrão ${produto.cavidadepadrao}`,
      });
    }

    // Deduplicação: não recria alerta se já existe um não-lido do mesmo tipo/máquina no último turno (4h)
    for (const alerta of alertas) {
      const recente = await prisma.alerta.findFirst({
        where: {
          maquina: snapshot.maquina,
          tipo:    alerta.tipo,
          criadoEm: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
      });
      if (recente) continue;
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

    const where: Record<string, unknown> = { resolvidoEm: null };
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
    await prisma.alerta.update({ where: { id }, data: { resolvidoEm: new Date() } });
  },

  // ── Deletar todos os lidos ────────────────────
  async deletarTodosLidos(): Promise<number> {
    const { count } = await prisma.alerta.updateMany({
      where: { lido: true, resolvidoEm: null },
      data: { resolvidoEm: new Date() }
    });
    return count;
  },

  // ── Contagem por severidade (para badges) ─────
  async contarNaoLidos(): Promise<{ total: number; critico: number; atencao: number; info: number }> {
    const [total, critico, atencao, info] = await Promise.all([
      prisma.alerta.count({ where: { lido: false, resolvidoEm: null } }),
      prisma.alerta.count({ where: { lido: false, severidade: 'CRITICO', resolvidoEm: null } }),
      prisma.alerta.count({ where: { lido: false, severidade: 'ATENCAO', resolvidoEm: null } }),
      prisma.alerta.count({ where: { lido: false, severidade: 'INFO', resolvidoEm: null } }),
    ]);
    return { total, critico, atencao, info };
  },
};

export { alertasService };
