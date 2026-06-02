// ─── Status Operacional ───────────────────────────────────────────────────────
export type StatusOperacional =
  | 'EM_PRODUCAO'
  | 'SETUP'
  | 'SETUP_DE_COR'
  | 'REGULAGEM'
  | 'MANUTENCAO'
  | 'FERRAMENTARIA'
  | 'AGUARDANDO_MP'
  | 'AGUARDANDO_TECNICO'
  | 'AGUARDANDO_LIBERACAO'
  | 'AGUARDANDO_ESTUFAGEM'
  | 'INATIVA'
  | 'REINICIO'
  | 'TRYOUT'
  | 'TROCA_DE_VERSAO'
  | 'FORA_DA_COR_PADRAO'
  | 'FALTA_DE_OPERADOR'
  | 'PARADA_PLANEJADA'
  | 'PARADA';

export type AlertaTipo =
  | 'CICLO_ACIMA'
  | 'CICLO_ABAIXO'
  | 'CAVIDADE_ABAIXO'
  | 'TROCA_PRODUTO'
  | 'MAQUINA_PARADA'
  | 'SETUP_EXCESSIVO'
  | 'RECORRENCIA'
  | 'DIVERGENCIA_PADRAO'
  | 'NOVO_OP'
  | 'SEM_LEITURA';

export type AlertaSeveridade = 'CRITICO' | 'ATENCAO' | 'INFO';

export type Turno = 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERADOR' | 'VISUALIZADOR';

// ─── Modelos ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  ciclopadrao: number;
  cavidadepadrao: number;
  ativo: boolean;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  data: string;
  turno: Turno;
  maquina: string;
  produtoNome: string;
  cicloAtual: number | null;
  cavidadeReal: number | null;
  velocidade: number | null;
  status: StatusOperacional;
  op: string | null;
  qtdOP: number | null;
  qtdAtual: number | null;
  observacao: string | null;
  divergente: boolean;
  manualOverride: boolean;
  produto?: Produto | null;
}

export interface KPIsData {
  total: number;
  emProducao: number;
  setup: number;
  regulagem: number;
  aguardando: number;
  paradas: number;
  inativas: number;
  divergentes: number;
  ultimaAtualizacao: string | null;
}

export interface RondaTurno {
  turno: Turno;
  emProducao: number;
  emSetup: number;
  emRegulagem: number;
  aguardando: number;
  paradas: number;
  inativas: number;
  divergencias: number;
  totalAlertas: number;
}

export interface Ronda {
  id: string;
  data: string;
  totalMaquinas: number;
  emProducao: number;
  emSetup: number;
  emRegulagem: number;
  aguardando: number;
  paradas: number;
  inativas: number;
  divergencias: number;
  totalAlertas: number;
  processadoEm: string;
  detalhesTurnos: RondaTurno[];
}

export interface Alerta {
  id: string;
  maquina: string;
  tipo: AlertaTipo;
  severidade: AlertaSeveridade;
  titulo: string;
  descricao: string;
  lido: boolean;
  resolvidoEm: string | null;
  criadoEm: string;
  snapshot?: Snapshot | null;
}

export interface AlertaContagem {
  total: number;
  critico: number;
  atencao: number;
  info: number;
}

export interface ComparativoDia {
  maquina: string;
  tipo: 'ok' | 'info' | 'warning' | 'danger';
  descricao: string;
  snapshotA: Snapshot | null;
  snapshotB: Snapshot | null;
}

export interface ComparativoTurno {
  maquina: string;
  primeiro: Snapshot | null;
  segundo: Snapshot | null;
  terceiro: Snapshot | null;
  divergencias: number;
}

export interface ResumoPeriodo {
  rondaId: string;
  data: string;
  totalMaquinas: number;
  emProducao: number;
  paradas: number;
  divergencias: number;
  produtividadePct: number;
}

export interface Configuracao {
  [chave: string]: string;
}

// ─── API responses ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ─── Labels helpers ───────────────────────────────────────────────────────────
export const STATUS_LABEL: Record<StatusOperacional, string> = {
  EM_PRODUCAO: 'Em Produção',
  SETUP: 'Setup',
  SETUP_DE_COR: 'Setup de Cor',
  REGULAGEM: 'Regulagem',
  MANUTENCAO: 'Manutenção',
  FERRAMENTARIA: 'Ferramentaria',
  AGUARDANDO_MP: 'Aguardando MP',
  AGUARDANDO_TECNICO: 'Aguardando Técnico',
  AGUARDANDO_LIBERACAO: 'Aguardando Liberação',
  AGUARDANDO_ESTUFAGEM: 'Aguardando Estufagem',
  INATIVA: 'Inativa',
  REINICIO: 'Reinício',
  TRYOUT: 'Tryout',
  TROCA_DE_VERSAO: 'Troca de Versão',
  FORA_DA_COR_PADRAO: 'Fora da Cor Padrão',
  FALTA_DE_OPERADOR: 'Falta de Operador',
  PARADA_PLANEJADA: 'Parada Planejada',
  PARADA: 'Parada',
};

export const ALERTA_TIPO_LABEL: Record<AlertaTipo, string> = {
  CICLO_ACIMA: 'Ciclo acima do padrão',
  CICLO_ABAIXO: 'Ciclo abaixo do padrão',
  CAVIDADE_ABAIXO: 'Cavidade abaixo do padrão',
  TROCA_PRODUTO: 'Troca de produto',
  MAQUINA_PARADA: 'Máquina parada',
  SETUP_EXCESSIVO: 'Setup excessivo',
  RECORRENCIA: 'Recorrência operacional',
  DIVERGENCIA_PADRAO: 'Divergência de padrão',
  NOVO_OP: 'Novo OP',
  SEM_LEITURA: 'Sem leitura',
};

export const TURNO_LABEL: Record<Turno, string> = {
  PRIMEIRO: '1º Turno',
  SEGUNDO: '2º Turno',
  TERCEIRO: '3º Turno',
};

export interface OperisSettingItem {
  label: string;
  valor: string;
  status: string;
  ativo: boolean;
}

export interface OperisSettingGroup {
  titulo: string;
  descricao: string;
  itens: OperisSettingItem[];
}

export type OperisSectionKey = 'central' | 'ronda' | 'comparativos' | 'alertas' | 'logs' | 'configuracoes';

export interface OperisNavItem {
  key: OperisSectionKey;
  label: string;
  href: string;
  icon: import('lucide-react').LucideIcon;
  badge?: number;
}

export interface OperisRoundItem {
  data: string;
  turno: string;
  maquinas: number;
  emProducao: number;
  emSetup: number;
  emRegulagem: number;
  aguardando: number;
  paradas: number;
  divergencias: number;
}

export interface OperisComparisonRow {
  indicador: string;
  ontem: string;
  hoje: string;
  resultado: string;
  detalhe: string;
  status: 'alerta' | 'mudanca' | 'ok';
}

export interface OperisAlertRecord {
  maquina: string;
  tipo: string;
  descricao: string;
  severidade: 'alta' | 'media' | 'baixa';
  recorrencia: string;
  timestamp: string;
}
