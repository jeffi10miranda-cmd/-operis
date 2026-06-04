'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  AlertCircle, TrendingUp, LayoutGrid, List, ChevronDown, Clock, Gauge, Search, X, ArrowRight,
} from 'lucide-react';
import { MachineCard } from '@/components/machine-card';
import { CentralSkeleton } from '@/components/skeleton';
import { useKPIs, useSnapshotsHoje, useAlertas, fetchConfiguracao } from '@/lib/api';
import type { ClockTema } from '@/app/configuracoes/page';
import { useTurno } from '@/contexts/turno-context';
import { useSocket } from '@/hooks/useSocket';
import type { KPIsData, Snapshot } from '@/types/operis';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';

const MOCK_KPIS: KPIsData = {
  total: 30, emProducao: 18, setup: 5, regulagem: 3, aguardando: 4,
  paradas: 4, inativas: 2, divergentes: 6,
  totalOPs: 0, totalAcumulado: 0, ultimaAtualizacao: null,
};

const MOCK_SNAPSHOTS: Snapshot[] = [
  { id: '1', data: '', turno: 'SEGUNDO', maquina: 'MÁQ 01', produtoNome: 'Frasco reto 12', cicloAtual: 50, cavidadeReal: 24, velocidade: 120, status: 'EM_PRODUCAO', op: null, qtdOP: null, qtdAtual: null, observacao: null, divergente: false, manualOverride: false, produto: { id: '', codigo: '', descricao: 'Frasco reto 12', ciclopadrao: 50, cavidadepadrao: 24, ativo: true, createdAt: '' } },
  { id: '2', data: '', turno: 'SEGUNDO', maquina: 'MÁQ 02', produtoNome: 'Tampa Kelly', cicloAtual: 20, cavidadeReal: 16, velocidade: 110, status: 'SETUP', op: null, qtdOP: null, qtdAtual: null, observacao: null, divergente: false, manualOverride: false, produto: { id: '', codigo: '', descricao: 'Tampa Kelly', ciclopadrao: 20, cavidadepadrao: 16, ativo: true, createdAt: '' } },
  { id: '3', data: '', turno: 'SEGUNDO', maquina: 'MÁQ 03', produtoNome: 'Haste 48 mm', cicloAtual: 30, cavidadeReal: 32, velocidade: 95, status: 'REGULAGEM', op: null, qtdOP: null, qtdAtual: null, observacao: null, divergente: true, manualOverride: false, produto: { id: '', codigo: '', descricao: 'Haste 48 mm', ciclopadrao: 30, cavidadepadrao: 28, ativo: true, createdAt: '' } },
];

const MOCK_ALERTS = [
  { id: '1', machine: 'MÁQ 04', title: 'Ciclo aumentado +5s acima do padrão', time: '14:30', severity: 'danger' as const },
  { id: '2', machine: 'MÁQ 06', title: 'Novo produto (Novo OP)', time: '14:28', severity: 'info' as const },
];

const alertIconBg = {
  danger: 'bg-red-500',
  warning: 'bg-amber-400',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const alertIcons = {
  danger: TrendingUp,
  warning: Clock,
  info: AlertCircle,
  purple: Gauge,
};

const trendData = [
  { h: '00:00', t1: 52, t2: 50, t3: 48 },
  { h: '08:00', t1: 48, t2: 51, t3: 47 },
  { h: '16:00', t1: 49, t2: 48, t3: 51 },
  { h: '24:00', t1: 51, t2: 50, t3: 48 },
];

function snapshotToCard(s: Snapshot) {
  return {
    maquina: s.maquina,
    turno:   s.turno,
    data:    s.data?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    name: s.maquina,
    product: s.produtoNome || s.produto?.descricao || '—',
    status: s.status,
    op: s.op,
    qtdOP: s.qtdOP,
    cycleCurrent: s.cicloAtual,
    cycleTarget: s.produto?.ciclopadrao ?? null,
    cavityCurrent: s.cavidadeReal,
    cavityTarget: s.produto?.cavidadepadrao ?? null,
    qtdAtual: s.qtdAtual,
    velocity: s.velocidade,
    divergent: s.divergente,
    observation: s.observacao,
    manualOverride: s.manualOverride,
  };
}

type TurnoView = 'TODOS' | 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';

function TurnoSection({ machines, viewMode, onUpdated }: {
  machines: ReturnType<typeof snapshotToCard>[];
  viewMode: 'grid' | 'list';
  onUpdated: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? machines : machines.slice(0, 10);

  return (
    <>
      {machines.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhum dado disponível.</p>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3'
          : 'space-y-2'}>
          {visible.map((m) => (
            <MachineCard key={`${m.maquina}`} {...m} onUpdated={onUpdated} />
          ))}
        </div>
      )}
      {machines.length > 10 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2"
        >
          {showAll ? 'Ver menos' : `Ver todas (${machines.length})`}
          <ChevronDown size={16} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </>
  );
}

const TURNO_CONFIG = [
  { id: 'PRIMEIRO' as const, label: '1º Turno', horario: '06:00–14:00', cor: 'bg-blue-500' },
  { id: 'SEGUNDO'  as const, label: '2º Turno', horario: '14:00–22:00', cor: 'bg-purple-500' },
  { id: 'TERCEIRO' as const, label: '3º Turno', horario: '22:00–06:00', cor: 'bg-slate-600' },
];

const STATUS_GROUPS: Record<string, string[]> = {
  EM_PRODUCAO: ['EM_PRODUCAO'],
  SETUP:       ['SETUP', 'SETUP_DE_COR', 'TROCA_DE_VERSAO', 'FORA_DA_COR_PADRAO'],
  REGULAGEM:   ['REGULAGEM', 'REINICIO', 'TRYOUT'],
  AGUARDANDO:  ['AGUARDANDO_MP', 'AGUARDANDO_TECNICO', 'AGUARDANDO_LIBERACAO', 'AGUARDANDO_ESTUFAGEM'],
  PARADAS:     ['MANUTENCAO', 'FERRAMENTARIA', 'FALTA_DE_OPERADOR', 'PARADA_PLANEJADA'],
  INATIVA:     ['INATIVA'],
};

const CLOCK_ESTILOS: Record<ClockTema, {
  card: string; label: string; time: string; date: string;
  badge: string; turno1: string; turno2: string; turno3: string; link: string;
}> = {
  escuro: {
    card: 'bg-operis-dark', label: 'text-white/40', time: 'text-white',
    date: 'text-white/60', badge: 'bg-white/10', turno1: 'text-blue-400',
    turno2: 'text-purple-400', turno3: 'text-amber-400', link: 'text-white/40 hover:text-white/70',
  },
  branco: {
    card: 'bg-white border border-gray-200', label: 'text-gray-400', time: 'text-gray-900',
    date: 'text-gray-400', badge: 'bg-gray-100', turno1: 'text-blue-600',
    turno2: 'text-purple-600', turno3: 'text-amber-600', link: 'text-gray-400 hover:text-gray-700',
  },
  azul: {
    card: 'bg-blue-600', label: 'text-white/50', time: 'text-white',
    date: 'text-white/70', badge: 'bg-white/20', turno1: 'text-white',
    turno2: 'text-white', turno3: 'text-white', link: 'text-white/50 hover:text-white/80',
  },
  preto: {
    card: 'bg-black', label: 'text-white/30', time: 'text-white',
    date: 'text-white/50', badge: 'bg-white/10', turno1: 'text-blue-400',
    turno2: 'text-purple-400', turno3: 'text-amber-400', link: 'text-white/30 hover:text-white/60',
  },
};

function DigitalClock() {
  const [now, setNow]     = useState(new Date());
  const [tema, setTema]   = useState<ClockTema>('escuro');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchConfiguracao()
      .then((cfg) => { if (!cancelled && cfg.clock_tema) setTema(cfg.clock_tema as ClockTema); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const est  = CLOCK_ESTILOS[tema] ?? CLOCK_ESTILOS.escuro;
  const hms  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const data = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  const h = now.getHours();
  const turno = h >= 6 && h < 14
    ? { label: '1º Turno', cor: est.turno1, horario: '06:00 – 14:00' }
    : h >= 14 && h < 22
    ? { label: '2º Turno', cor: est.turno2, horario: '14:00 – 22:00' }
    : { label: '3º Turno', cor: est.turno3, horario: '22:00 – 06:00' };

  return (
    <div className={`card p-5 flex flex-col items-center gap-2 ${est.card}`}>
      <p className={`text-[10px] uppercase tracking-widest font-semibold ${est.label}`}>Horário atual</p>
      <p className={`font-mono text-4xl font-bold tracking-wider tabular-nums leading-none ${est.time}`}>
        {hms}
      </p>
      <p className={`text-xs capitalize ${est.date}`}>{data}</p>
      <div className={`mt-1 flex items-center gap-2 rounded-full px-3 py-1 ${est.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${turno.cor}`} />
        <span className={`text-xs font-semibold ${turno.cor}`}>{turno.label}</span>
        <span className={`text-[10px] ${est.date}`}>{turno.horario}</span>
      </div>
      <Link href="/comparativos" className={`mt-1 flex items-center gap-1 text-[10px] transition-colors ${est.link}`}>
        Ver métricas por turno <ArrowRight size={10} />
      </Link>
    </div>
  );
}

export default function CentralPage() {
  useSocket();
  const { turnoAtual: turnoView } = useTurno();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataFiltro, setDataFiltro] = useState(hoje);

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const { data: kpisData, isLoading: kpiLoading, error: kpiError, mutate: reloadKpis } = useKPIs();
  const { data: t1Raw, mutate: reloadT1 } = useSnapshotsHoje('PRIMEIRO', dataFiltro);
  const { data: t2Raw, mutate: reloadT2 } = useSnapshotsHoje('SEGUNDO',  dataFiltro);
  const { data: t3Raw, mutate: reloadT3 } = useSnapshotsHoje('TERCEIRO', dataFiltro);
  const { data: alertasData } = useAlertas({ lido: false, limit: 5 });
  const isHoje = dataFiltro === hoje;

  function reloadAll() {
    reloadT1(undefined, { revalidate: true });
    reloadT2(undefined, { revalidate: true });
    reloadT3(undefined, { revalidate: true });
    reloadKpis(undefined, { revalidate: true });
  }

  function applyFilters(machines: ReturnType<typeof snapshotToCard>[]) {
    const q = searchQuery.trim().toLowerCase();
    return machines.filter(m => {
      const matchSearch = !q ||
        m.op?.toLowerCase().includes(q) ||
        m.maquina?.toLowerCase().includes(q) ||
        m.product.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'TODOS' ||
        (STATUS_GROUPS[statusFilter] ?? [statusFilter]).includes(m.status);
      return matchSearch && matchStatus;
    });
  }

  const t1 = useMemo(() => ((t1Raw as Snapshot[] | undefined) ?? []).map(snapshotToCard), [t1Raw]);
  const t2 = useMemo(() => ((t2Raw as Snapshot[] | undefined) ?? []).map(snapshotToCard), [t2Raw]);
  const t3 = useMemo(() => ((t3Raw as Snapshot[] | undefined) ?? []).map(snapshotToCard), [t3Raw]);

  const turnoDataMap = { PRIMEIRO: t1, SEGUNDO: t2, TERCEIRO: t3 };
  const turnoReloadMap = { PRIMEIRO: reloadT1, SEGUNDO: reloadT2, TERCEIRO: reloadT3 };

  const snapshots = turnoView === 'TODOS'
    ? [...t1, ...t2, ...t3]
    : turnoDataMap[turnoView] ?? [];

  const previewMode = Boolean(kpiError) && !kpisData;
  const kpis = (kpisData as KPIsData | undefined) ?? MOCK_KPIS;
  const total = kpis.total || snapshots.length || 1;

  const pieData = [
    { name: 'Em produção', value: kpis.emProducao, color: '#22c55e' },
    { name: 'Setup/Ajustes', value: kpis.setup, color: '#f59e0b' },
    { name: 'Regulagem', value: kpis.regulagem, color: '#a855f7' },
    { name: 'Aguardando', value: kpis.aguardando, color: '#f97316' },
    { name: 'Paradas', value: kpis.paradas, color: '#ef4444' },
    { name: 'Inativas', value: kpis.inativas, color: '#94a3b8' },
  ];

  const pct    = (v: number, t: number) => (t > 0 ? `${Math.round((v / t) * 100)}% do total` : '—');
  const fmtNum = (v: number) => v.toLocaleString('pt-BR');
  const pctOP  = kpis.totalOPs > 0 ? Math.min(100, Math.round((kpis.totalAcumulado / kpis.totalOPs) * 100)) : 0;

  const kpiCards = [
    { label: 'Total de máquinas', value: kpis.total,      meta: 'Monitoradas'              },
    { label: 'Em produção',       value: kpis.emProducao, meta: pct(kpis.emProducao, total) },
    { label: 'Setup / ajustes',   value: kpis.setup,      meta: pct(kpis.setup, total)      },
    { label: 'Regulagem',         value: kpis.regulagem,  meta: pct(kpis.regulagem, total)  },
    { label: 'Aguardando',        value: kpis.aguardando, meta: pct(kpis.aguardando, total) },
    { label: 'Paradas',           value: kpis.paradas,    meta: pct(kpis.paradas, total)    },
    { label: 'Inativas',          value: kpis.inativas,   meta: pct(kpis.inativas, total)   },
  ];

  if (kpiLoading) return <CentralSkeleton />;

  return (
    <div className="space-y-3 sm:space-y-5">
      {previewMode && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          Modo visualização — dados de exemplo. Faça login com o backend ativo para ver dados reais.
        </div>
      )}

      {/* KPIs — 7 de status + 1 card OPs (col-span-2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-9 gap-2 sm:gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="kpi-corporate !px-3 !py-3 sm:!px-5 sm:!py-4">
            <p className="kpi-corporate__label text-[9px] sm:text-[10px]">{k.label}</p>
            <p className="kpi-corporate__value !text-2xl sm:!text-3xl">{k.value}</p>
            <p className="kpi-corporate__meta hidden sm:block">{k.meta}</p>
          </div>
        ))}

        {/* Card OPs do Dia — ocupa 2 colunas */}
        <div className="kpi-corporate !px-4 !py-3 col-span-2 xl:col-span-2">
          <p className="kpi-corporate__label text-[9px] sm:text-[10px] mb-2">OPs do Dia</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400">Meta</p>
              <p className="text-base font-bold text-operis-dark tabular-nums leading-tight">{fmtNum(kpis.totalOPs)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Realizado</p>
              <p className="text-base font-bold text-green-600 tabular-nums leading-tight">{fmtNum(kpis.totalAcumulado)}</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pctOP >= 80 ? 'bg-green-500' : pctOP >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${pctOP}%` }} />
          </div>
          <p className={`text-[10px] font-bold mt-0.5 text-right ${pctOP >= 80 ? 'text-green-600' : pctOP >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {pctOP}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3 sm:gap-5 items-start">
        <div className="card p-3 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-operis-dark">Status das Máquinas</h2>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-operis-dark text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-operis-dark text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Barra de busca e filtros */}
          {(() => {
            const filterTabs = [
              { id: 'TODOS',       label: 'Todos',        count: kpis.total },
              { id: 'EM_PRODUCAO', label: 'Em Produção',  count: kpis.emProducao },
              { id: 'SETUP',       label: 'Setup',        count: kpis.setup },
              { id: 'REGULAGEM',   label: 'Regulagem',    count: kpis.regulagem },
              { id: 'AGUARDANDO',  label: 'Aguardando',   count: kpis.aguardando },
              { id: 'PARADAS',     label: 'Paradas',      count: kpis.paradas },
              { id: 'INATIVA',     label: 'Inativas',     count: kpis.inativas },
            ];
            return (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por OP, máquina ou produto…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-gray-50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {filterTabs.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        statusFilter === f.id
                          ? 'bg-operis-dark text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}{f.count > 0 ? ` (${f.count})` : ''}
                    </button>
                  ))}
                  {/* Filtro de data — junto com os outros filtros */}
                  <div className="flex items-center gap-1 ml-1">
                    <input
                      type="date"
                      value={dataFiltro}
                      max={hoje}
                      onChange={e => setDataFiltro(e.target.value)}
                      className="input text-xs py-1 px-2 w-34 h-7"
                    />
                    {!isHoje && (
                      <button
                        onClick={() => setDataFiltro(hoje)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors h-7"
                      >
                        Hoje
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Visão: turno específico */}
          {turnoView !== 'TODOS' && (
            <TurnoSection
              machines={applyFilters(turnoDataMap[turnoView] ?? [])}
              viewMode={viewMode}
              onUpdated={reloadAll}
            />
          )}

          {/* Visão: todos os turnos separados */}
          {turnoView === 'TODOS' && (
            <div className="space-y-6">
              {TURNO_CONFIG.map(tc => {
                const maquinas = applyFilters(turnoDataMap[tc.id] ?? []);
                return (
                  <div key={tc.id}>
                    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl`} style={{ background: 'var(--operis-surface)' }}>
                      <span className={`w-3 h-3 rounded-full ${tc.cor}`} />
                      <span className="text-sm font-bold text-operis-dark">{tc.label}</span>
                      <span className="text-xs text-gray-400">{tc.horario}</span>
                      <span className="ml-auto text-xs font-semibold text-gray-500">{maquinas.length} máquinas</span>
                      <span className="text-xs text-green-600 font-semibold">
                        {maquinas.filter(m => m.status === 'EM_PRODUCAO').length} em produção
                      </span>
                    </div>
                    {maquinas.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Sem dados para este turno.</p>
                    ) : (
                      <TurnoSection
                        machines={maquinas}
                        viewMode={viewMode}
                        onUpdated={reloadAll}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <DigitalClock />

          {alertasData?.items?.length > 0 && (
          <div className="card p-3 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base font-bold text-operis-dark">Alertas importantes</h2>
              <Link href="/alertas" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Ver todos</Link>
            </div>
            <div className="space-y-1">
              {alertasData.items.map((a: { id: string; maquina: string; titulo: string; severidade: string; tipo: string; criadoEm: string }) => {
                const sev = a.severidade === 'CRITICO' ? 'danger' : a.severidade === 'ATENCAO' ? 'warning' : 'info';
                const Ico = alertIcons[sev] ?? AlertCircle;
                const hora = new Date(a.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={a.id} className="alert-item-row">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${alertIconBg[sev]}`}>
                      <Ico size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-operis-dark">{a.maquina}</p>
                      <p className="text-[11px] text-gray-500 leading-tight">{a.titulo}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{hora}</span>
                  </div>
                );
              })}
            </div>
            <Link href="/alertas" className="mt-3 block w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700">
              Ver todos os alertas
            </Link>
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        <div className="card p-3 sm:p-5">
          <h3 className="text-sm font-bold text-operis-dark mb-3">Evolução do ciclo médio</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="h" tick={{ fontSize: 10 }} stroke="#ccc" />
              <YAxis tick={{ fontSize: 10 }} stroke="#ccc" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #eee' }} />
              <Line type="monotone" dataKey="t1" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="t2" stroke="#a855f7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="t3" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-3 sm:p-5">
          <h3 className="text-sm font-bold text-operis-dark mb-3">Distribuição de status</h3>
          <div className="relative flex items-center justify-center" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-operis-dark">{total}</span>
              <span className="text-[11px] text-gray-400">Máquinas</span>
            </div>
          </div>
          <div className="space-y-1.5 mt-3">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-gray-700">
                  {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-3 sm:p-5 flex flex-col justify-center sm:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-bold text-operis-dark mb-2">Resumo operacional</h3>
          <p className="text-xs text-gray-500">
            {kpis.divergentes} máquinas com divergência detectada.
            {kpis.ultimaAtualizacao
              ? ` Última atualização: ${new Date(kpis.ultimaAtualizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
              : ''}
          </p>
          <Link href="/comparativos" className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700">
            Abrir comparativos →
          </Link>
        </div>
      </div>
    </div>
  );
}
