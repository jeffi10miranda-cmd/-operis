'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  Clock3,
  ClipboardList,
  Crosshair,
  Gauge,
  Hexagon,
  Home,
  LayoutGrid,
  List,
  PlayCircle,
  Power,
  Settings,
  SlidersHorizontal,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertasOverview } from '@/components/alertas/alertas-overview';
import { ComparativosOverview } from '@/components/comparativos/comparativos-overview';
import { ConfiguracoesOverview } from '@/components/configuracoes/configuracoes-overview';
import { RondaOverview } from '@/components/ronda/ronda-overview';
import { useContagemAlertas, useKPIs, useRondaHoje, useSnapshotsHoje } from '@/lib/api';
import type { OperisNavItem, OperisSectionKey } from '@/types/operis';
import { useSocket } from '@/hooks/useSocket';

type DashboardKpis = {
  total: number;
  emProducao: number;
  setup: number;
  regulagem: number;
  aguardando: number;
  paradas: number;
  inativas: number;
  divergentes: number;
  ultimaAtualizacao: string;
};

type ProdutoResumo = {
  descricao?: string;
  ciclopadrao?: number | null;
  cavidadepadrao?: number | null;
};

type Snapshot = {
  id: string;
  maquina: string;
  turno: 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';
  status: string;
  produtoNome?: string | null;
  cicloAtual?: number | null;
  cavidadeReal?: number | null;
  velocidade?: number | null;
  divergente?: boolean;
  observacao?: string | null;
  produto?: ProdutoResumo | null;
};

type RondaHoje = {
  totalMaquinas: number;
  emProducao: number;
  emSetup: number;
  emRegulagem: number;
  aguardando: number;
  paradas: number;
  inativas: number;
  divergencias: number;
  totalAlertas: number;
};

type AlertItem = {
  id: string;
  machine: string;
  title: string;
  description: string;
  time: string;
  tone: 'danger' | 'warning' | 'info' | 'purple';
};

type MetricTone = 'green' | 'amber' | 'purple' | 'orange' | 'red' | 'slate';

type MachineCard = {
  id: string;
  machine: string;
  product: string;
  status: string;
  cycleCurrent: number | null;
  cycleTarget: number | null;
  cavityCurrent: number | null;
  cavityTarget: number | null;
  progress: number;
  tone: MetricTone;
  icon: LucideIcon;
};

const DASHBOARD_CANVAS_WIDTH = 1520;

const TURNOS = [
  { value: 'TODOS', label: 'Todos os turnos' },
  { value: 'PRIMEIRO', label: '1o turno' },
  { value: 'SEGUNDO', label: '2o turno' },
  { value: 'TERCEIRO', label: '3o turno' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  EM_PRODUCAO: 'Em producao',
  SETUP: 'Setup',
  SETUP_DE_COR: 'Setup de cor',
  REGULAGEM: 'Regulagem',
  MANUTENCAO: 'Manutencao',
  FERRAMENTARIA: 'Ferramentaria',
  AGUARDANDO_MP: 'Aguardando MP',
  AGUARDANDO_TECNICO: 'Aguardando tecnico',
  AGUARDANDO_LIBERACAO: 'Aguardando liberacao',
  AGUARDANDO_ESTUFAGEM: 'Aguardando estufagem',
  FORA_DA_COR_PADRAO: 'Fora da cor padrao',
  INATIVA: 'Inativa',
  REINICIO: 'Reinicio',
  TRYOUT: 'Tryout',
  TROCA_DE_VERSAO: 'Troca de versao',
};

const STATUS_META: Record<string, { tone: MetricTone; icon: LucideIcon; progress: number }> = {
  EM_PRODUCAO: { tone: 'green', icon: PlayCircle, progress: 0.86 },
  SETUP: { tone: 'amber', icon: Wrench, progress: 0.38 },
  SETUP_DE_COR: { tone: 'amber', icon: Wrench, progress: 0.43 },
  REGULAGEM: { tone: 'purple', icon: SlidersHorizontal, progress: 0.55 },
  MANUTENCAO: { tone: 'red', icon: Hexagon, progress: 0.26 },
  FERRAMENTARIA: { tone: 'red', icon: Hexagon, progress: 0.24 },
  AGUARDANDO_MP: { tone: 'orange', icon: Clock3, progress: 0.42 },
  AGUARDANDO_TECNICO: { tone: 'orange', icon: Clock3, progress: 0.36 },
  AGUARDANDO_LIBERACAO: { tone: 'orange', icon: Clock3, progress: 0.33 },
  AGUARDANDO_ESTUFAGEM: { tone: 'orange', icon: Clock3, progress: 0.3 },
  FORA_DA_COR_PADRAO: { tone: 'amber', icon: TriangleAlert, progress: 0.31 },
  INATIVA: { tone: 'slate', icon: Power, progress: 0.18 },
  REINICIO: { tone: 'purple', icon: Activity, progress: 0.4 },
  TRYOUT: { tone: 'purple', icon: Crosshair, progress: 0.48 },
  TROCA_DE_VERSAO: { tone: 'amber', icon: Wrench, progress: 0.34 },
};

const KPI_TONES: Record<MetricTone, { stroke: string; bg: string }> = {
  green: { stroke: '#16a34a', bg: '#effbf3' },
  amber: { stroke: '#f59e0b', bg: '#fff8eb' },
  purple: { stroke: '#7c3aed', bg: '#f6f0ff' },
  orange: { stroke: '#f97316', bg: '#fff4ec' },
  red: { stroke: '#ef4444', bg: '#fff1f1' },
  slate: { stroke: '#334155', bg: '#eff3f8' },
};

const SIDEBAR_ITEMS: OperisNavItem[] = [
  { key: 'central', label: 'Central', href: '/central', icon: Home },
  { key: 'ronda', label: 'Ronda', href: '/ronda', icon: ClipboardList },
  { key: 'comparativos', label: 'Comparativos', href: '/comparativos', icon: BarChart3 },
  { key: 'alertas', label: 'Alertas', href: '/alertas', icon: Bell, badge: 6 },
  { key: 'configuracoes', label: 'Configuracoes', href: '/configuracoes', icon: Settings },
];

const MOCK_KPIS: DashboardKpis = {
  total: 30,
  emProducao: 18,
  setup: 5,
  regulagem: 3,
  aguardando: 4,
  paradas: 4,
  inativas: 2,
  divergentes: 6,
  ultimaAtualizacao: '',
};

const MOCK_SNAPSHOTS: Snapshot[] = [
  { id: 'maq-01', maquina: 'MAQ 01', turno: 'PRIMEIRO', status: 'EM_PRODUCAO', produtoNome: 'Frasco reto 12', cicloAtual: 50, cavidadeReal: 24, velocidade: 68, produto: { descricao: 'Frasco reto 12', ciclopadrao: 50, cavidadepadrao: 24 } },
  { id: 'maq-02', maquina: 'MAQ 02', turno: 'PRIMEIRO', status: 'SETUP', produtoNome: 'Tampa Kelly - Preto', cicloAtual: 20, cavidadeReal: 16, velocidade: 0, produto: { descricao: 'Tampa Kelly - Preto', ciclopadrao: 20, cavidadepadrao: 16 } },
  { id: 'maq-03', maquina: 'MAQ 03', turno: 'PRIMEIRO', status: 'REGULAGEM', produtoNome: 'Haste 48 mm', cicloAtual: 30, cavidadeReal: 28, velocidade: 53, produto: { descricao: 'Haste 48 mm', ciclopadrao: 30, cavidadepadrao: 32 } },
  { id: 'maq-04', maquina: 'MAQ 04', turno: 'SEGUNDO', status: 'MANUTENCAO', produtoNome: 'Frasco reto 05', cicloAtual: 24, cavidadeReal: null, velocidade: 0, produto: { descricao: 'Frasco reto 05', ciclopadrao: 24, cavidadepadrao: null } },
  { id: 'maq-05', maquina: 'MAQ 05', turno: 'SEGUNDO', status: 'AGUARDANDO_MP', produtoNome: 'Peneira - Rosa', cicloAtual: 22, cavidadeReal: 16, velocidade: 0, produto: { descricao: 'Peneira - Rosa', ciclopadrao: 22, cavidadepadrao: 16 } },
  { id: 'maq-06', maquina: 'MAQ 06', turno: 'SEGUNDO', status: 'EM_PRODUCAO', produtoNome: 'Pote 500g', cicloAtual: 24, cavidadeReal: 16, velocidade: 72, produto: { descricao: 'Pote 500g', ciclopadrao: 24, cavidadepadrao: 16 } },
  { id: 'maq-07', maquina: 'MAQ 07', turno: 'SEGUNDO', status: 'EM_PRODUCAO', produtoNome: 'Tampa 38mm', cicloAtual: 24, cavidadeReal: 16, velocidade: 70, produto: { descricao: 'Tampa 38mm', ciclopadrao: 24, cavidadepadrao: 16 } },
  { id: 'maq-08', maquina: 'MAQ 08', turno: 'TERCEIRO', status: 'SETUP_DE_COR', produtoNome: 'Garrafa PET', cicloAtual: 20, cavidadeReal: 32, velocidade: 0, produto: { descricao: 'Garrafa PET', ciclopadrao: 20, cavidadepadrao: 32 } },
  { id: 'maq-09', maquina: 'MAQ 09', turno: 'TERCEIRO', status: 'REGULAGEM', produtoNome: 'Bisnaga 120g', cicloAtual: 25, cavidadeReal: 14, velocidade: 48, produto: { descricao: 'Bisnaga 120g', ciclopadrao: 25, cavidadepadrao: 16 } },
  { id: 'maq-10', maquina: 'MAQ 10', turno: 'TERCEIRO', status: 'MANUTENCAO', produtoNome: null, cicloAtual: null, cavidadeReal: null, velocidade: 0, produto: { descricao: '-', ciclopadrao: null, cavidadepadrao: null } },
];

const MOCK_ALERT_COUNT = { naoLidos: 6 };

const MOCK_RONDA: RondaHoje = {
  totalMaquinas: 30,
  emProducao: 18,
  emSetup: 5,
  emRegulagem: 3,
  aguardando: 4,
  paradas: 4,
  inativas: 2,
  divergencias: 6,
  totalAlertas: 6,
};

const MOCK_ALERTS: AlertItem[] = [
  { id: 'a1', machine: 'MAQ 04', title: 'MAQ 04', description: 'Ciclo aumentou +5s acima do padrao', time: '14:30', tone: 'danger' },
  { id: 'a2', machine: 'MAQ 06', title: 'MAQ 06', description: 'Novo produto (Novo OP)', time: '14:28', tone: 'info' },
  { id: 'a3', machine: 'MAQ 05', title: 'MAQ 05', description: 'Aguardando materia prima', time: '14:26', tone: 'warning' },
  { id: 'a4', machine: 'MAQ 03', title: 'MAQ 03', description: 'Em regulagem', time: '14:24', tone: 'purple' },
  { id: 'a5', machine: 'MAQ 10', title: 'MAQ 10', description: 'Maquina parada', time: '14:22', tone: 'danger' },
];

const TREND_DATA = [
  { hora: '00:00', primeiro: 26, segundo: 38, terceiro: 42 },
  { hora: '04:00', primeiro: 24, segundo: 34, terceiro: 48 },
  { hora: '08:00', primeiro: 27, segundo: 35, terceiro: 39 },
  { hora: '12:00', primeiro: 23, segundo: 30, terceiro: 46 },
  { hora: '16:00', primeiro: 26, segundo: 33, terceiro: 41 },
  { hora: '20:00', primeiro: 24, segundo: 32, terceiro: 47 },
  { hora: '24:00', primeiro: 27, segundo: 38, terceiro: 44 },
];

const COMPARISON_ROWS = [
  { label: 'Ciclo medio', first: '8,4s', second: '9,1s', third: '9,0s', delta: '+0,7s', trend: 'up' },
  { label: 'Velocidade media', first: '68%', second: '72%', third: '70%', delta: '+4%', trend: 'good' },
  { label: 'Cavidades reais', first: '412', second: '438', third: '428', delta: '+26', trend: 'good' },
  { label: 'Trocas de produto', first: '7', second: '9', third: '8', delta: '+2', trend: 'up' },
  { label: 'Maquinas paradas', first: '3', second: '4', third: '4', delta: '+1', trend: 'up' },
];

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPercent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatSeconds(value: number | null | undefined) {
  const normalized = formatNumber(value);
  return normalized === '-' ? '-' : `${normalized}s`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getToneForStatus(status: string): MetricTone {
  return STATUS_META[status]?.tone ?? 'slate';
}

function getLabelForStatus(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function getCurrentShiftLabel(turno: (typeof TURNOS)[number]['value']) {
  if (turno === 'TODOS') return '2o Turno';
  return TURNOS.find((item) => item.value === turno)?.label ?? '2o Turno';
}

function normalizeSnapshot(snapshot: Snapshot): MachineCard {
  const meta = STATUS_META[snapshot.status] ?? STATUS_META.INATIVA;
  return {
    id: snapshot.id,
    machine: snapshot.maquina,
    product: snapshot.produto?.descricao ?? snapshot.produtoNome ?? 'Produto nao identificado',
    status: getLabelForStatus(snapshot.status),
    cycleCurrent: snapshot.cicloAtual ?? null,
    cycleTarget: snapshot.produto?.ciclopadrao ?? snapshot.cicloAtual ?? null,
    cavityCurrent: snapshot.cavidadeReal ?? null,
    cavityTarget: snapshot.produto?.cavidadepadrao ?? snapshot.cavidadeReal ?? null,
    progress: meta.progress,
    tone: meta.tone,
    icon: meta.icon,
  };
}

function getSectionFromPath(pathname: string): OperisSectionKey {
  if (pathname.startsWith('/ronda')) return 'ronda';
  if (pathname.startsWith('/comparativos')) return 'comparativos';
  if (pathname.startsWith('/alertas')) return 'alertas';
  if (pathname.startsWith('/logs')) return 'logs';
  if (pathname.startsWith('/configuracoes')) return 'configuracoes';
  return 'central';
}

const SECTION_META: Record<OperisSectionKey, { subtitle: string; title: string }> = {
  central: {
    title: 'Dashboard',
    subtitle: 'Visao geral da producao em tempo real',
  },
  ronda: {
    title: 'Ronda',
    subtitle: 'Snapshots historicos, consolidacao diaria e filtros operacionais',
  },
  comparativos: {
    title: 'Comparativos',
    subtitle: 'Analise historica entre turnos, dias, semanas e meses',
  },
  alertas: {
    title: 'Alertas',
    subtitle: 'Eventos inteligentes para leitura operacional rapida',
  },
    logs: {
      title: 'Logs',
      subtitle: 'Auditoria de sincronizacoes e alteracoes do sistema',
    },
  configuracoes: {
    title: 'Configuracoes',
    subtitle: 'Integracoes, governanca, usuarios e regras do sistema',
  },
};

export function DashboardShell() {
  useSocket();
  const pathname = usePathname();

  const [turno, setTurno] = useState<(typeof TURNOS)[number]['value']>('SEGUNDO');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [machineFilter, setMachineFilter] = useState('TODAS');
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState<string | null>(null);
  const [dashboardScale, setDashboardScale] = useState(1);
  const [dashboardHeight, setDashboardHeight] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const selectedTurno = turno === 'TODOS' ? undefined : turno;

  useEffect(() => {
    setPreviewUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    function updateScale() {
      const widthScale = window.innerWidth / DASHBOARD_CANVAS_WIDTH;
      const nextScale = Math.min(Math.max(widthScale, 0.36), 1);
      setDashboardScale(nextScale);

      if (canvasRef.current) {
        setDashboardHeight(canvasRef.current.offsetHeight * nextScale);
      }
    }

    updateScale();

    const resizeObserver = new ResizeObserver(() => updateScale());
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const { data: kpisData, error: kpiError, isLoading: kpiLoading } = useKPIs();
  const { data: snapshotsData, error: snapshotsError, isLoading: snapshotsLoading } = useSnapshotsHoje(selectedTurno);
  const { data: contagemData } = useContagemAlertas();
  const { data: rondaHojeData } = useRondaHoje();

  const previewMode = Boolean(kpiError || snapshotsError) || !kpisData || !snapshotsData;
  const kpis = (kpisData as DashboardKpis | undefined) ?? MOCK_KPIS;
  const rondaHoje = (rondaHojeData as RondaHoje | null | undefined) ?? MOCK_RONDA;
  const alertCount = (contagemData as { naoLidos?: number } | undefined)?.naoLidos ?? MOCK_ALERT_COUNT.naoLidos;
  const updatedAtLabel = previewMode
    ? previewUpdatedAt
      ? formatUpdatedAt(previewUpdatedAt)
      : 'Aguardando leitura'
    : formatUpdatedAt(kpis.ultimaAtualizacao);

  const machineCards = useMemo(() => {
    const source = (snapshotsData as Snapshot[] | undefined) ?? MOCK_SNAPSHOTS;
    const filteredByMachine = machineFilter === 'TODAS' ? source : source.filter((item) => item.maquina === machineFilter);
    return filteredByMachine.map(normalizeSnapshot);
  }, [machineFilter, snapshotsData]);

  const machineOptions = useMemo(() => {
    const uniqueMachines = Array.from(new Set(((snapshotsData as Snapshot[] | undefined) ?? MOCK_SNAPSHOTS).map((item) => item.maquina)));
    return ['TODAS', ...uniqueMachines];
  }, [snapshotsData]);

  const displayCards = machineCards.slice(0, 10);
  const selectedShiftLabel = getCurrentShiftLabel(turno);
  const currentSection = getSectionFromPath(pathname);
  const currentMeta = SECTION_META[currentSection];
  const isCentral = currentSection === 'central';

  const metricCards = [
    { label: 'Maquinas monitoradas', value: kpis.total, tone: 'slate' as MetricTone, icon: Building2 },
    { label: 'Em producao', value: kpis.emProducao, tone: 'green' as MetricTone, icon: PlayCircle },
    { label: 'Setup / Ajustes', value: kpis.setup, tone: 'amber' as MetricTone, icon: Wrench },
    { label: 'Regulagem', value: kpis.regulagem, tone: 'purple' as MetricTone, icon: SlidersHorizontal },
    { label: 'Aguardando', value: kpis.aguardando, tone: 'orange' as MetricTone, icon: Clock3 },
    { label: 'Paradas', value: kpis.paradas, tone: 'red' as MetricTone, icon: Hexagon },
    { label: 'Inativas', value: kpis.inativas, tone: 'slate' as MetricTone, icon: Power },
  ];

  const distributionData = [
    { name: 'Em producao', value: kpis.emProducao, color: KPI_TONES.green.stroke },
    { name: 'Setup / Ajustes', value: kpis.setup, color: KPI_TONES.amber.stroke },
    { name: 'Regulagem', value: kpis.regulagem, color: KPI_TONES.purple.stroke },
    { name: 'Aguardando', value: kpis.aguardando, color: KPI_TONES.orange.stroke },
    { name: 'Paradas', value: kpis.paradas, color: KPI_TONES.red.stroke },
    { name: 'Inativas', value: kpis.inativas, color: KPI_TONES.slate.stroke },
  ];

  return (
    <main className="ops-stage">
      <div
        className="ops-stage__viewport"
        style={{
          height: dashboardHeight ? `${dashboardHeight}px` : undefined,
          width: `${DASHBOARD_CANVAS_WIDTH * dashboardScale}px`,
        }}
      >
        <div
          className="ops-stage__canvas"
          ref={canvasRef}
          style={{ transform: `scale(${dashboardScale})` }}
        >
          <div className="ops-layout">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <div className="ops-brand__mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>OPERIS</strong>
            <small>Painel de producao</small>
          </div>
        </div>

        <nav className="ops-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={`ops-nav__item${item.key === currentSection ? ' is-active' : ''}`} href={item.href} key={item.label}>
                <Icon size={20} />
                <span>{item.label}</span>
                {item.badge ? <em>{item.badge}</em> : null}
              </Link>
            );
          })}
        </nav>

        <div className="ops-sidebar__cards">
          <section className="ops-sidecard">
            <div className="ops-sidecard__dot" />
            <strong>Sincronizacao</strong>
            <p>Ultima atualizacao</p>
            <b>{updatedAtLabel}</b>
            <p>Proxima atualizacao</p>
            <b>00:45</b>
          </section>

          <section className="ops-sidecard">
            <p>Turno atual</p>
            <strong>{selectedShiftLabel}</strong>
            <span>14:00 - 22:00</span>
          </section>
        </div>

        <div className="ops-sidebar__footer">OPERIS v1.0.0</div>
      </aside>

      <div className="ops-main" id="painel">
        <header className="ops-topbar">
          <div>
            <h1>{currentMeta.title}</h1>
            <p>{currentMeta.subtitle}</p>
          </div>

          <div className="ops-topbar__actions">
            <label className="ops-select">
              <span>Turno atual:</span>
              <select value={turno} onChange={(event) => setTurno(event.target.value as (typeof TURNOS)[number]['value'])}>
                {TURNOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} />
            </label>

            <button className="ops-bell" type="button">
              <Bell size={20} />
              <span>{alertCount}</span>
            </button>

            <div className="ops-userchip">
              <div className="ops-userchip__avatar">S</div>
              <div>
                <strong>Supervisor</strong>
                <span>Operacional</span>
              </div>
            </div>
          </div>
        </header>

        {previewMode ? (
          <div className="ops-preview-banner">
            Foundation do OPERIS em modo visualizacao. Quando a API estiver disponivel, os modulos passam a usar dados reais, eventos Socket.io e regras operacionais.
          </div>
        ) : null}

        <section className="ops-kpis">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            const tone = KPI_TONES[metric.tone];
            return (
              <article className="ops-kpi" key={metric.label}>
                <div className="ops-kpi__icon" style={{ color: tone.stroke }}>
                  <Icon size={24} />
                </div>
                <div className="ops-kpi__body">
                  <strong>{kpiLoading ? '...' : formatNumber(metric.value)}</strong>
                  <span>{metric.label}</span>
                  <small style={{ color: tone.stroke }}>{formatPercent(metric.value, kpis.total)}</small>
                </div>
                <div className="ops-kpi__bar">
                  <i style={{ backgroundColor: tone.stroke, width: `${Math.max(16, Math.round((metric.value / Math.max(kpis.total, 1)) * 100))}%` }} />
                </div>
              </article>
            );
          })}
        </section>

        {isCentral ? (
        <>
        <section className="ops-section">
          <div className="ops-section__main">
            <div className="ops-panel ops-panel--main">
              <div className="ops-panel__header">
                <div>
                  <h2>Status das Maquinas</h2>
                  <p>{snapshotsLoading ? 'Carregando leituras...' : `${displayCards.length} maquinas em destaque`}</p>
                </div>

                <div className="ops-toolbar">
                  <label className="ops-select ops-select--small">
                    <select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)}>
                      {machineOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'TODAS' ? 'Todas as maquinas' : option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </label>

                  <div className="ops-toggle">
                    <button className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')} type="button">
                      <LayoutGrid size={18} />
                    </button>
                    <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} type="button">
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="machine-grid">
                  {displayCards.map((card) => {
                    const Icon = card.icon;
                    const tone = KPI_TONES[card.tone];
                    return (
                      <article className="machine-card" key={card.id}>
                        <div className="machine-card__top">
                          <div>
                            <h3>{card.machine}</h3>
                            <span className={`machine-pill machine-pill--${card.tone}`}>{card.status}</span>
                          </div>
                          <div className="machine-card__badge" style={{ color: tone.stroke, backgroundColor: tone.bg }}>
                            <Icon size={18} />
                          </div>
                        </div>

                        <div className="machine-card__product">
                          <span>Produto</span>
                          <strong>{card.product}</strong>
                        </div>

                        <div className="machine-card__stats">
                          <div>
                            <span>Ciclo atual</span>
                            <strong>{formatSeconds(card.cycleCurrent)}</strong>
                          </div>
                          <div>
                            <span>Ciclo padrao</span>
                            <strong>{formatSeconds(card.cycleTarget)}</strong>
                          </div>
                          <div>
                            <span>Cavidade</span>
                            <strong>
                              {formatNumber(card.cavityCurrent)} / {formatNumber(card.cavityTarget)}
                            </strong>
                          </div>
                        </div>

                        <div className="machine-card__progress">
                          <i style={{ width: `${Math.round(card.progress * 100)}%`, backgroundColor: tone.stroke }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="machine-list">
                  <div className="machine-list__head">
                    <span>Maquina</span>
                    <span>Status</span>
                    <span>Produto</span>
                    <span>Ciclo</span>
                    <span>Cavidade</span>
                  </div>
                  {displayCards.map((card) => (
                    <div className="machine-list__row" key={card.id}>
                      <strong>{card.machine}</strong>
                      <span className={`machine-pill machine-pill--${card.tone}`}>{card.status}</span>
                      <span>{card.product}</span>
                      <span>{formatSeconds(card.cycleCurrent)} / {formatSeconds(card.cycleTarget)}</span>
                      <span>{formatNumber(card.cavityCurrent)} / {formatNumber(card.cavityTarget)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="ops-linkbutton" type="button">
                Ver todas as maquinas
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <aside className="ops-section__side">
            <section className="ops-panel ops-panel--alerts">
              <div className="ops-panel__header">
                <div>
                  <h2>Alertas importantes</h2>
                  <p>Itens com maior impacto agora</p>
                </div>
                <button className="ops-textlink" type="button">
                  Ver todos
                </button>
              </div>

              <div className="alert-list">
                {MOCK_ALERTS.map((alert) => (
                  <article className="alert-item" key={alert.id}>
                    <div className={`alert-item__icon alert-item__icon--${alert.tone}`}>
                      <ArrowRight size={18} />
                    </div>
                    <div className="alert-item__body">
                      <strong>{alert.title}</strong>
                      <p>{alert.description}</p>
                    </div>
                    <time>{alert.time}</time>
                  </article>
                ))}
              </div>

              <button className="ops-textlink ops-textlink--bottom" type="button">
                Ver todos os alertas
              </button>
            </section>

            <section className="ops-phone">
              <div className="ops-phone__notch" />
              <div className="ops-phone__header">
                <strong>OPERIS</strong>
                <span>2o Turno</span>
              </div>

              <div className="ops-phone__title">Dashboard</div>

              <div className="ops-phone__kpis">
                {metricCards.slice(0, 4).map((metric) => {
                  const tone = KPI_TONES[metric.tone];
                  return (
                    <div className="ops-phone__kpi" key={metric.label}>
                      <b>{formatNumber(metric.value)}</b>
                      <span>{metric.label}</span>
                      <i style={{ backgroundColor: tone.stroke }} />
                    </div>
                  );
                })}
              </div>

              <div className="ops-phone__section">
                <div className="ops-phone__section-header">
                  <strong>Maquinas em operacao</strong>
                  <button type="button">Ver todas</button>
                </div>

                {displayCards.slice(0, 2).map((card) => (
                  <div className="ops-phone__machine" key={card.id}>
                    <div className="ops-phone__machine-top">
                      <strong>{card.machine}</strong>
                      <span className={`machine-pill machine-pill--${card.tone}`}>{card.status}</span>
                    </div>
                    <p>{card.product}</p>
                    <div className="ops-phone__machine-metrics">
                      <span>Ciclo {formatSeconds(card.cycleCurrent)}</span>
                      <span>Padrao {formatSeconds(card.cycleTarget)}</span>
                      <span>
                        Cavidade {formatNumber(card.cavityCurrent)} / {formatNumber(card.cavityTarget)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ops-phone__nav">
                <span>Dashboard</span>
                <span>Ronda</span>
                <span>Comparativos</span>
                <span>Alertas</span>
              </div>
            </section>
          </aside>
        </section>

        <section className="ops-analytics">
          <section className="ops-panel analytics-card">
            <div className="ops-panel__header">
              <div>
                <h2>Evolucao do ciclo medio</h2>
                <p>Comparativo dos tres turnos</p>
              </div>
            </div>

            <div className="chart-shell">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={TREND_DATA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#e8edf4" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: '1px solid #dbe3ef', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }}
                    labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="primeiro" name="1o Turno" stroke="#16a34a" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="segundo" name="2o Turno" stroke="#2563eb" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="terceiro" name="3o Turno" stroke="#7c3aed" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="ops-panel analytics-card">
            <div className="ops-panel__header">
              <div>
                <h2>Distribuicao de status</h2>
                <p>Visao consolidada do turno</p>
              </div>
            </div>

            <div className="chart-shell chart-shell--pie">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={distributionData} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={4}>
                    {distributionData.map((entry) => (
                      <Cell fill={entry.color} key={entry.name} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: '1px solid #dbe3ef', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pie-center">
                <strong>{formatNumber(rondaHoje.totalMaquinas)}</strong>
                <span>Maquinas</span>
              </div>
            </div>

            <div className="distribution-list">
              {distributionData.map((item) => (
                <div className="distribution-list__item" key={item.name}>
                  <span>
                    <i style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <b>
                    {item.value} ({formatPercent(item.value, kpis.total)})
                  </b>
                </div>
              ))}
            </div>
          </section>

          <section className="ops-panel analytics-card">
            <div className="ops-panel__header">
              <div>
                <h2>Comparativo entre turnos</h2>
                <p>Leitura rapida das diferencas</p>
              </div>
            </div>

            <div className="comparison-tabs">
              <button type="button">1o Turno</button>
              <button className="is-active" type="button">2o Turno</button>
              <button type="button">3o Turno</button>
              <span>Delta 2T vs 1T</span>
            </div>

            <div className="comparison-table">
              {COMPARISON_ROWS.map((row) => (
                <div className="comparison-table__row" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.first}</strong>
                  <strong className="is-active">{row.second}</strong>
                  <strong>{row.third}</strong>
                  <em className={row.trend === 'good' ? 'is-good' : 'is-up'}>{row.delta}</em>
                </div>
              ))}
            </div>
          </section>
        </section>
        </>
        ) : null}

        {!isCentral ? (
          <section className="ops-module-content">
            {currentSection === 'ronda' ? <RondaOverview /> : null}
            {currentSection === 'comparativos' ? <ComparativosOverview /> : null}
            {currentSection === 'alertas' ? <AlertasOverview /> : null}
            {currentSection === 'configuracoes' ? <ConfiguracoesOverview /> : null}
          </section>
        ) : null}

        <nav className="ops-mobile-nav">
          {SIDEBAR_ITEMS.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link className={item.key === currentSection ? 'is-active' : ''} href={item.href} key={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
          </div>
        </div>
      </div>
    </main>
  );
}
