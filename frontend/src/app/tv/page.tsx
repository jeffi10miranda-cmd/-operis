'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Settings, Gauge, AlertCircle, Clock, StopCircle, Power,
  Droplets, RotateCcw, Wrench, Minimize2, TrendingUp, TrendingDown,
  LayoutGrid, BarChart3, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useKPIs, useSnapshotsHoje } from '@/lib/api';
import type { KPIsData, Snapshot } from '@/types/operis';
import { OperisLogoFull } from '@/components/operis-logo';

// ── Tema ──────────────────────────────────────
type Theme = 'dark' | 'light';

const T = {
  dark: {
    page:            { background: 'linear-gradient(180deg,#050d15 0%,#071219 60%,#040a10 100%)' } as React.CSSProperties,
    headerCls:       'border-white/5',
    headerStyle:     {} as React.CSSProperties,
    card:            { background: 'rgba(255,255,255,0.03)' } as React.CSSProperties,
    cardBorder:      'border-white/8',
    textPrimary:     'text-white',
    textSecondary:   'text-slate-300',
    textMuted:       'text-slate-500',
    divider:         'divide-white/5',
    borderColor:     'border-white/8',
    rowHover:        'hover:bg-white/[0.03]',
    grid:            'rgba(255,255,255,0.05)',
    axis:            '#475569',
    toggleWrap:      'bg-white/5 border-white/10',
    toggleActive:    'bg-white/15 text-white',
    toggleInactive:  'text-slate-400 hover:text-slate-200',
    exitBtn:         'bg-white/10 border-white/10 text-slate-300 hover:bg-white/20',
    tooltipStyle:    { background: 'rgba(5,13,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 10px', fontSize: 11 } as React.CSSProperties,
    footerBorder:    'border-white/5',
  },
  light: {
    page:            { background: '#eef2f7' } as React.CSSProperties,
    headerCls:       'border-gray-200 shadow-sm',
    headerStyle:     { background: '#ffffff' } as React.CSSProperties,
    card:            { background: '#ffffff' } as React.CSSProperties,
    cardBorder:      'border-gray-200',
    textPrimary:     'text-gray-900',
    textSecondary:   'text-gray-700',
    textMuted:       'text-gray-500',
    divider:         'divide-gray-100',
    borderColor:     'border-gray-200',
    rowHover:        'hover:bg-gray-50',
    grid:            'rgba(0,0,0,0.08)',
    axis:            '#64748b',
    toggleWrap:      'bg-gray-100 border-gray-200',
    toggleActive:    'bg-white text-gray-900 shadow-sm',
    toggleInactive:  'text-gray-500 hover:text-gray-700',
    exitBtn:         'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm',
    tooltipStyle:    { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 10px', fontSize: 11, color: '#1e293b' } as React.CSSProperties,
    footerBorder:    'border-gray-100',
  },
} as const;

// ── Mock data ─────────────────────────────────
const MOCK_KPIS: KPIsData = {
  total: 30, emProducao: 18, setup: 5, regulagem: 3, aguardando: 4,
  paradas: 4, inativas: 2, divergentes: 6,
  totalOPs: 0, totalAcumulado: 0, ultimaAtualizacao: null,
};

const MOCK_SNAPSHOTS: Snapshot[] = [
  { id:'1',  data:'', turno:'SEGUNDO', maquina:'MÁQ 01', produtoNome:'Frasco reto 12',  cicloAtual:50, cavidadeReal:24, velocidade:120, status:'EM_PRODUCAO',  op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Frasco reto 12',  ciclopadrao:50, cavidadepadrao:24, ativo:true, createdAt:''} },
  { id:'2',  data:'', turno:'SEGUNDO', maquina:'MÁQ 02', produtoNome:'Tampa Kelly',     cicloAtual:20, cavidadeReal:16, velocidade:110, status:'SETUP',        op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Tampa Kelly',     ciclopadrao:20, cavidadepadrao:16, ativo:true, createdAt:''} },
  { id:'3',  data:'', turno:'SEGUNDO', maquina:'MÁQ 03', produtoNome:'Haste 48 mm',     cicloAtual:30, cavidadeReal:32, velocidade:95,  status:'REGULAGEM',    op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:true,  manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Haste 48 mm',     ciclopadrao:30, cavidadepadrao:28, ativo:true, createdAt:''} },
  { id:'4',  data:'', turno:'SEGUNDO', maquina:'MÁQ 04', produtoNome:'Frasco 500ml',    cicloAtual:0,  cavidadeReal:0,  velocidade:0,   status:'PARADA',       op:null, qtdOP:null, qtdAtual:null, observacao:'Aguardando técnico', divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Frasco 500ml',    ciclopadrao:45, cavidadepadrao:20, ativo:true, createdAt:''} },
  { id:'5',  data:'', turno:'SEGUNDO', maquina:'MÁQ 05', produtoNome:'Batoque 15',      cicloAtual:15, cavidadeReal:64, velocidade:130, status:'EM_PRODUCAO',  op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Batoque 15',      ciclopadrao:15, cavidadepadrao:64, ativo:true, createdAt:''} },
  { id:'6',  data:'', turno:'SEGUNDO', maquina:'MÁQ 06', produtoNome:'Pote 1kg',        cicloAtual:80, cavidadeReal:8,  velocidade:100, status:'EM_PRODUCAO',  op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Pote 1kg',        ciclopadrao:80, cavidadepadrao:8,  ativo:true, createdAt:''} },
  { id:'7',  data:'', turno:'SEGUNDO', maquina:'MÁQ 07', produtoNome:'Tampa 1kg',       cicloAtual:25, cavidadeReal:32, velocidade:110, status:'MANUTENCAO',   op:null, qtdOP:null, qtdAtual:null, observacao:'Troca de molde', divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Tampa 1kg',       ciclopadrao:25, cavidadepadrao:32, ativo:true, createdAt:''} },
  { id:'8',  data:'', turno:'SEGUNDO', maquina:'MÁQ 08', produtoNome:'Frasco cilíndrico',cicloAtual:40, cavidadeReal:16, velocidade:115, status:'EM_PRODUCAO',  op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Frasco cilíndrico',ciclopadrao:40, cavidadepadrao:16, ativo:true, createdAt:''} },
  { id:'9',  data:'', turno:'SEGUNDO', maquina:'MÁQ 09', produtoNome:'Dosador 5ml',     cicloAtual:18, cavidadeReal:48, velocidade:125, status:'EM_PRODUCAO',  op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Dosador 5ml',     ciclopadrao:18, cavidadepadrao:48, ativo:true, createdAt:''} },
  { id:'10', data:'', turno:'SEGUNDO', maquina:'MÁQ 10', produtoNome:'Estojo M',        cicloAtual:0,  cavidadeReal:0,  velocidade:0,   status:'INATIVA',      op:null, qtdOP:null, qtdAtual:null, observacao:null, divergente:false, manualOverride:false, capturadoEm: '', statusAtualizadoEm: '', produto:{id:'',codigo:'',descricao:'Estojo M',        ciclopadrao:60, cavidadepadrao:12, ativo:true, createdAt:''} },
];

const MOCK_ALERTS = [
  { id:'1', machine:'MÁQ 04', title:'Ciclo aumentado +5s acima do padrão', sev:'danger' },
  { id:'2', machine:'MÁQ 09', title:'Cavidade abaixo do padrão', sev:'danger' },
  { id:'3', machine:'MÁQ 03', title:'Divergência detectada no ciclo', sev:'warning' },
  { id:'4', machine:'MÁQ 06', title:'Troca de produto (Setup de Cor)', sev:'info' },
];

// ── Dados dos gráficos ────────────────────────
const BAR_DATA = [
  { turno:'1º Turno', anterior:5200, atual:4800 },
  { turno:'2º Turno', anterior:6100, atual:7200 },
  { turno:'3º Turno', anterior:5800, atual:6450 },
];

const LINE_DATA = [
  { t:'00h', anterior:20, atual:22 },
  { t:'04h', anterior:22, atual:24 },
  { t:'08h', anterior:21, atual:26 },
  { t:'12h', anterior:23, atual:25 },
  { t:'16h', anterior:22, atual:27 },
  { t:'20h', anterior:24, atual:23 },
  { t:'24h', anterior:23, atual:25 },
];

const PIE_DATA = [
  { name:'Em produção', value:18, color:'#22c55e' },
  { name:'Setup',       value:5,  color:'#f59e0b' },
  { name:'Regulagem',   value:3,  color:'#a855f7' },
  { name:'Aguardando',  value:4,  color:'#f97316' },
  { name:'Paradas',     value:3,  color:'#ef4444' },
  { name:'Inativas',    value:2,  color:'#94a3b8' },
];

const COMP_KPI = [
  { label:'Ciclo médio',    value:'23,4s',     delta:'+9,9%',  up:true  },
  { label:'Produção total', value:'18.450 un', delta:'+8,7%',  up:false },
  { label:'Setup/Ajustes',  value:'11h 23m',   delta:'+11,2%', up:true  },
  { label:'Paradas',        value:'5h 45m',    delta:'-8,0%',  up:false },
  { label:'Disponibilidade',value:'86,3%',     delta:'-2,4%',  up:true  },
  { label:'Eficiência',     value:'76,8%',     delta:'+3,6%',  up:false },
];

// ── Status config com fundos sólidos ─────────
type StatusCfg = { label:string; card:string; border:string; text:string; numBg:string; numText:string; labelTxt:string; nameTxt:string; prodTxt:string; icon:React.ElementType; dot:string };

function makeDark(label:string, card:string, border:string, text:string, icon:React.ElementType, dot:string): StatusCfg {
  return { label, card, border, text, numBg:'bg-black/30', numText:'text-white', labelTxt:'text-slate-400', nameTxt:'text-white', prodTxt:'text-slate-200', icon, dot };
}
function makeLight(label:string, card:string, border:string, text:string, icon:React.ElementType, dot:string): StatusCfg {
  return { label, card, border, text, numBg:'bg-black/[0.12]', numText:'text-gray-950', labelTxt:'text-gray-600', nameTxt:'text-gray-950', prodTxt:'text-gray-800', icon, dot };
}

const STATUS_DARK: Record<string, StatusCfg> = {
  EM_PRODUCAO:          makeDark('Em Produção',   '#071a0e', 'border-green-500/50',  'text-green-400',   Play,        'bg-green-400'),
  SETUP:                makeDark('Setup',          '#1c1400', 'border-amber-400/50',  'text-amber-300',   Settings,    'bg-amber-400'),
  SETUP_DE_COR:         makeDark('Setup de Cor',   '#1c1400', 'border-amber-400/50',  'text-amber-300',   Droplets,    'bg-amber-400'),
  REGULAGEM:            makeDark('Regulagem',      '#12091f', 'border-purple-500/50', 'text-purple-400',  Gauge,       'bg-purple-400'),
  MANUTENCAO:           makeDark('Manutenção',     '#1c0808', 'border-red-500/50',    'text-red-400',     Wrench,      'bg-red-400'),
  FERRAMENTARIA:        makeDark('Ferramentaria',  '#1c0808', 'border-red-500/50',    'text-red-400',     Wrench,      'bg-red-400'),
  AGUARDANDO_MP:        makeDark('Aguard. MP',     '#1c1000', 'border-orange-400/50', 'text-orange-400',  Clock,       'bg-orange-400'),
  AGUARDANDO_TECNICO:   makeDark('Aguard. Tec.',   '#1c1000', 'border-orange-400/50', 'text-orange-400',  Clock,       'bg-orange-400'),
  AGUARDANDO_LIBERACAO: makeDark('Aguard. Lib.',   '#1c1000', 'border-orange-400/50', 'text-orange-400',  Clock,       'bg-orange-400'),
  AGUARDANDO_ESTUFAGEM: makeDark('Aguard. Est.',   '#1c1000', 'border-orange-400/50', 'text-orange-400',  Clock,       'bg-orange-400'),
  PARADA:               makeDark('Parada',         '#1f0606', 'border-red-600/50',    'text-red-400',     StopCircle,  'bg-red-500'),
  INATIVA:              makeDark('Inativa',        '#0d1117', 'border-slate-500/40',  'text-slate-400',   Power,       'bg-slate-500'),
  REINICIO:             makeDark('Reinício',       '#0f0a1c', 'border-purple-400/50', 'text-purple-400',  RotateCcw,   'bg-purple-400'),
  TRYOUT:               makeDark('Tryout',         '#12091f', 'border-purple-500/50', 'text-purple-400',  Gauge,       'bg-purple-400'),
  TROCA_DE_VERSAO:      makeDark('Troca Versão',   '#1c1400', 'border-amber-400/50',  'text-amber-300',   Settings,    'bg-amber-400'),
  FORA_DA_COR_PADRAO:   makeDark('Fora Cor Padr.', '#1c1000', 'border-amber-500/50',  'text-amber-400',   AlertCircle, 'bg-amber-500'),
  FALTA_DE_OPERADOR:    makeDark('Falta Operador', '#1f0610', 'border-rose-500/50',   'text-rose-400',    Clock,       'bg-rose-500'),
  PARADA_PLANEJADA:     makeDark('Parada Plan.',   '#0d1117', 'border-slate-500/40',  'text-slate-400',   StopCircle,  'bg-slate-500'),
};

const STATUS_LIGHT: Record<string, StatusCfg> = {
  EM_PRODUCAO:          makeLight('Em Produção',   '#86efac', 'border-green-600',     'text-green-900',   Play,        'bg-green-700'),
  SETUP:                makeLight('Setup',          '#fde047', 'border-amber-600',     'text-amber-900',   Settings,    'bg-amber-700'),
  SETUP_DE_COR:         makeLight('Setup de Cor',   '#fde047', 'border-amber-600',     'text-amber-900',   Droplets,    'bg-amber-700'),
  REGULAGEM:            makeLight('Regulagem',      '#c4b5fd', 'border-purple-600',    'text-purple-900',  Gauge,       'bg-purple-700'),
  MANUTENCAO:           makeLight('Manutenção',     '#fca5a5', 'border-red-600',       'text-red-900',     Wrench,      'bg-red-700'),
  FERRAMENTARIA:        makeLight('Ferramentaria',  '#fca5a5', 'border-red-600',       'text-red-900',     Wrench,      'bg-red-700'),
  AGUARDANDO_MP:        makeLight('Aguard. MP',     '#fdba74', 'border-orange-600',    'text-orange-900',  Clock,       'bg-orange-700'),
  AGUARDANDO_TECNICO:   makeLight('Aguard. Tec.',   '#fdba74', 'border-orange-600',    'text-orange-900',  Clock,       'bg-orange-700'),
  AGUARDANDO_LIBERACAO: makeLight('Aguard. Lib.',   '#fdba74', 'border-orange-600',    'text-orange-900',  Clock,       'bg-orange-700'),
  AGUARDANDO_ESTUFAGEM: makeLight('Aguard. Est.',   '#fdba74', 'border-orange-600',    'text-orange-900',  Clock,       'bg-orange-700'),
  PARADA:               makeLight('Parada',         '#f87171', 'border-red-700',       'text-red-950',     StopCircle,  'bg-red-800'),
  INATIVA:              makeLight('Inativa',        '#94a3b8', 'border-slate-600',     'text-slate-900',   Power,       'bg-slate-700'),
  REINICIO:             makeLight('Reinício',       '#c4b5fd', 'border-purple-500',    'text-purple-900',  RotateCcw,   'bg-purple-600'),
  TRYOUT:               makeLight('Tryout',         '#d8b4fe', 'border-purple-600',    'text-purple-900',  Gauge,       'bg-purple-700'),
  TROCA_DE_VERSAO:      makeLight('Troca Versão',   '#fde047', 'border-amber-600',     'text-amber-900',   Settings,    'bg-amber-700'),
  FORA_DA_COR_PADRAO:   makeLight('Fora Cor Padr.', '#fdba74', 'border-orange-600',    'text-orange-900',  AlertCircle, 'bg-orange-700'),
  FALTA_DE_OPERADOR:    makeLight('Falta Operador', '#fda4af', 'border-rose-600',      'text-rose-900',    Clock,       'bg-rose-700'),
  PARADA_PLANEJADA:     makeLight('Parada Plan.',   '#94a3b8', 'border-slate-600',     'text-slate-900',   StopCircle,  'bg-slate-700'),
};

const FALLBACK_DARK  = makeDark ('', '#0d1117', 'border-slate-500/40', 'text-slate-400', Clock, 'bg-slate-500');
const FALLBACK_LIGHT = makeLight('', '#e2e8f0', 'border-slate-300',    'text-slate-600', Clock, 'bg-slate-400');

// ── TV Machine Card ───────────────────────────
function TvMachineCard({ snapshot, theme }: { snapshot: Snapshot; theme: Theme }) {
  const map  = theme === 'dark' ? STATUS_DARK : STATUS_LIGHT;
  const fall = theme === 'dark' ? FALLBACK_DARK : FALLBACK_LIGHT;
  const cfg  = map[snapshot.status] ?? { ...fall, label: snapshot.status };
  const Icon = cfg.icon;

  const cycleOff =
    snapshot.cicloAtual && snapshot.produto?.ciclopadrao
      ? Math.round(((snapshot.cicloAtual - snapshot.produto.ciclopadrao) / snapshot.produto.ciclopadrao) * 100)
      : null;

  const cavityBad =
    snapshot.cavidadeReal != null &&
    snapshot.produto?.cavidadepadrao != null &&
    snapshot.cavidadeReal < snapshot.produto.cavidadepadrao;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-2.5 ${cfg.border} ${snapshot.divergente ? 'ring-2 ring-amber-400/60' : ''}`}
      style={{ backgroundColor: cfg.card }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`font-bold text-base leading-none ${cfg.nameTxt}`}>{snapshot.maquina}</span>
        </div>
        <Icon size={16} className="opacity-50" />
      </div>

      <span className={`text-[11px] font-bold uppercase tracking-wide opacity-90 leading-none ${cfg.text}`}>{cfg.label}</span>

      <p className={`text-xs leading-tight line-clamp-1 font-medium ${cfg.prodTxt}`}>
        {snapshot.produtoNome || snapshot.produto?.descricao || '—'}
      </p>

      <div className="grid grid-cols-2 gap-1.5 mt-auto">
        <div className={`${cfg.numBg} rounded-lg px-2 py-1.5 text-center`}>
          <p className={`text-[9px] font-semibold uppercase tracking-wide leading-none mb-0.5 ${cfg.labelTxt}`}>Ciclo</p>
          <p className={`text-sm font-bold leading-none ${
            cycleOff === null ? cfg.numText :
            cycleOff > 5 ? 'text-red-500' :
            cycleOff < -5 ? 'text-blue-400' : 'text-green-500'
          }`}>
            {snapshot.cicloAtual ? `${snapshot.cicloAtual}s` : '—'}
            {cycleOff !== null && cycleOff !== 0 && (
              <span className="text-[10px] ml-1 font-semibold">{cycleOff > 0 ? `+${cycleOff}` : cycleOff}%</span>
            )}
          </p>
        </div>
        <div className={`${cfg.numBg} rounded-lg px-2 py-1.5 text-center`}>
          <p className={`text-[9px] font-semibold uppercase tracking-wide leading-none mb-0.5 ${cfg.labelTxt}`}>Cavidade</p>
          <p className={`text-sm font-bold leading-none ${cavityBad ? 'text-red-500' : cfg.numText}`}>
            {snapshot.cavidadeReal ?? '—'}
            {snapshot.produto?.cavidadepadrao ? (
              <span className={`text-[10px] font-medium ${cfg.labelTxt}`}>/{snapshot.produto.cavidadepadrao}</span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── TV Comparativo — apenas gráficos ─────────
function TvComparativo({ theme, kpis }: { theme: Theme; kpis: KPIsData }) {
  const tk = T[theme];
  const total = kpis.total || 1;

  const statusStrip = [
    { label:'Em produção', value: kpis.emProducao,  color:'text-green-500',  pct: Math.round(kpis.emProducao  / total * 100) },
    { label:'Setup',       value: kpis.setup,       color:'text-amber-500',  pct: Math.round(kpis.setup       / total * 100) },
    { label:'Regulagem',   value: kpis.regulagem,   color:'text-purple-500', pct: Math.round(kpis.regulagem   / total * 100) },
    { label:'Aguardando',  value: kpis.aguardando,  color:'text-orange-500', pct: Math.round(kpis.aguardando  / total * 100) },
    { label:'Paradas',     value: kpis.paradas,     color:'text-red-500',    pct: Math.round(kpis.paradas     / total * 100) },
    { label:'Inativas',    value: kpis.inativas,    color:'text-slate-400',  pct: Math.round(kpis.inativas    / total * 100) },
  ];

  const pieDataReal = [
    { name:'Em produção', value: kpis.emProducao,  color:'#22c55e' },
    { name:'Setup',       value: kpis.setup,       color:'#f59e0b' },
    { name:'Regulagem',   value: kpis.regulagem,   color:'#a855f7' },
    { name:'Aguardando',  value: kpis.aguardando,  color:'#f97316' },
    { name:'Paradas',     value: kpis.paradas,     color:'#ef4444' },
    { name:'Inativas',    value: kpis.inativas,    color:'#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* KPI strip — dados reais */}
      <div className="grid grid-cols-6 gap-3 flex-shrink-0">
        {statusStrip.map((k) => (
          <div key={k.label} className={`rounded-2xl border ${tk.cardBorder} px-4 py-3 flex flex-col gap-1`} style={tk.card}>
            <p className={`text-[10px] uppercase tracking-widest leading-none ${tk.textMuted}`}>{k.label}</p>
            <p className={`text-3xl font-bold tabular-nums leading-none ${k.color}`}>{k.value}</p>
            <p className={`text-[11px] font-semibold ${tk.textMuted}`}>{k.pct}% do total</p>
          </div>
        ))}
      </div>

      {/* 3 gráficos em colunas iguais */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">

        {/* Barras — Produção por turno */}
        <div className={`rounded-2xl border ${tk.cardBorder} p-5 flex flex-col`} style={tk.card}>
          <p className={`text-sm font-bold mb-0.5 ${tk.textPrimary}`}>Produção por turno</p>
          <p className={`text-[11px] mb-4 ${tk.textMuted}`}>Unidades — período anterior vs. atual</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BAR_DATA} barSize={20} margin={{ top:4, right:8, bottom:0, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tk.grid} vertical={false} />
                <XAxis dataKey="turno" tick={{ fontSize:10, fill:tk.axis }} stroke="transparent" />
                <YAxis tick={{ fontSize:10, fill:tk.axis }} stroke="transparent" />
                <Tooltip contentStyle={tk.tooltipStyle} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="anterior" fill={theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#cbd5e1'} name="Anterior" radius={[4,4,0,0]} />
                <Bar dataKey="atual"    fill="#3b82f6" name="Atual" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 flex-shrink-0">
            <span className={`flex items-center gap-1.5 text-[11px] ${tk.textMuted}`}>
              <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }} /> Anterior
            </span>
            <span className={`flex items-center gap-1.5 text-[11px] ${tk.textSecondary}`}>
              <span className="w-3 h-2.5 rounded-sm bg-blue-500 inline-block" /> Atual
            </span>
          </div>
        </div>

        {/* Linha — Evolução do ciclo médio */}
        <div className={`rounded-2xl border ${tk.cardBorder} p-5 flex flex-col`} style={tk.card}>
          <p className={`text-sm font-bold mb-0.5 ${tk.textPrimary}`}>Evolução do ciclo médio</p>
          <p className={`text-[11px] mb-4 ${tk.textMuted}`}>Segundos ao longo do dia</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LINE_DATA} margin={{ top:4, right:8, bottom:0, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tk.grid} />
                <XAxis dataKey="t" tick={{ fontSize:10, fill:tk.axis }} stroke="transparent" />
                <YAxis tick={{ fontSize:10, fill:tk.axis }} stroke="transparent" />
                <Tooltip contentStyle={tk.tooltipStyle} />
                <Line type="monotone" dataKey="anterior" stroke={theme === 'dark' ? 'rgba(255,255,255,0.3)' : '#94a3b8'} strokeWidth={2} dot={false} strokeDasharray="5 3" name="Anterior" />
                <Line type="monotone" dataKey="atual"    stroke="#22c55e" strokeWidth={2.5} dot={false} name="Atual" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 flex-shrink-0">
            <span className={`flex items-center gap-1.5 text-[11px] ${tk.textMuted}`}>
              <span className="w-5 border-b-2 border-dashed inline-block" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.3)' : '#94a3b8' }} /> Anterior
            </span>
            <span className={`flex items-center gap-1.5 text-[11px] ${tk.textSecondary}`}>
              <span className="w-5 border-b-2 border-green-500 inline-block" /> Atual
            </span>
          </div>
        </div>

        {/* Donut — Distribuição real de status */}
        <div className={`rounded-2xl border ${tk.cardBorder} p-5 flex flex-col`} style={tk.card}>
          <p className={`text-sm font-bold mb-4 ${tk.textPrimary}`}>Distribuição de status</p>
          <div className="flex items-center gap-4 flex-1 min-h-0">
            <div className="relative flex-shrink-0" style={{ width:160, height:160 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieDataReal} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieDataReal.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-2xl font-black ${tk.textPrimary}`}>{kpis.total}</span>
                <span className={`text-[10px] ${tk.textMuted}`}>Máquinas</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
              {pieDataReal.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className={`flex items-center gap-2 text-xs ${tk.textSecondary}`}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${tk.textPrimary}`}>
                    {d.value}
                    <span className={`text-[10px] font-normal ml-1 ${tk.textMuted}`}>
                      ({Math.round(d.value / total * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Relógio ───────────────────────────────────
function LiveClock({ theme }: { theme: Theme }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const tk = T[theme];
  if (!now) return <div className="w-24" />;
  return (
    <div className="text-right leading-none">
      <p className={`text-2xl font-bold tabular-nums ${tk.textPrimary}`}>
        {now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      </p>
      <p className={`text-xs mt-0.5 ${tk.textMuted}`}>
        {now.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' })}
      </p>
    </div>
  );
}

// ── Prioridade de exibição no scroll ─────────
function statusPriority(status: string): number {
  if (status === 'INATIVA')                                      return 0;
  if (['PARADA', 'PARADA_PLANEJADA'].includes(status))           return 1;
  if (['MANUTENCAO', 'FERRAMENTARIA'].includes(status))          return 2;
  if (status.startsWith('AGUARDANDO'))                           return 3;
  if (status === 'EM_PRODUCAO')                                  return 5;
  return 4; // Setup, Regulagem, Tryout, etc.
}

// ── Grid com auto-scroll vertical ────────────
const COLS = 6;

const SCROLL_SPEED = 0.4; // px por frame (~24px/s a 60fps)

function TvScrollGrid({ snapshots, theme }: { snapshots: Snapshot[]; theme: Theme }) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => statusPriority(a.status) - statusPriority(b.status)),
    [snapshots],
  );

  const wrapRef  = useRef<HTMLDivElement>(null);
  const posRef   = useRef(0);
  const pauseRef = useRef(false);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    posRef.current = 0;
    cancelAnimationFrame(rafRef.current);

    const el = wrapRef.current;
    if (!el || sorted.length === 0) return;

    function tick() {
      if (el && !pauseRef.current) {
        const half = el.scrollHeight / 2;
        if (half > 0) {
          posRef.current = (posRef.current + SCROLL_SPEED) % half;
          el.scrollTop = posRef.current;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    // Aguarda o DOM pintar antes de medir scrollHeight
    const t = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 100);
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); };
  }, [sorted]);

  return (
    <div
      ref={wrapRef}
      className="tv-scroll-wrap absolute inset-0"
      onMouseEnter={() => { pauseRef.current = true;  }}
      onMouseLeave={() => { pauseRef.current = false; }}
    >
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {[...sorted, ...sorted].map((s, i) => (
          <TvMachineCard key={`${s.id}-${i}`} snapshot={s} theme={theme} />
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────
type TvView = 'maquinas' | 'comparativo';

export default function TvPage() {
  const router = useRouter();
  const [view,    setView]    = useState<TvView>('maquinas');
  const [theme,   setTheme]   = useState<Theme>('dark');
  const [kpiOpen, setKpiOpen] = useState(true);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: kpisData,     error: kpiError  } = useKPIs();
  const { data: snapshotsData,error: snapError } = useSnapshotsHoje();

  const kpis      = (kpisData      as KPIsData   | undefined) ?? MOCK_KPIS;
  const snapshots = useMemo(() => (snapshotsData as Snapshot[] | undefined) ?? MOCK_SNAPSHOTS, [snapshotsData]);
  const isPreview = Boolean(kpiError || snapError);
  const tk        = T[theme];

  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    window.addEventListener('keydown',   resetHideTimer);
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      window.removeEventListener('keydown',   resetHideTimer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push('/central');
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleExit(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleExit]);

  const kpiStrip = [
    { label:'Em produção',     value: kpis.emProducao,  color:'text-green-500'  },
    { label:'Setup / ajustes', value: kpis.setup,       color:'text-amber-500'  },
    { label:'Regulagem',       value: kpis.regulagem,   color:'text-purple-500' },
    { label:'Aguardando',      value: kpis.aguardando,  color:'text-orange-500' },
    { label:'Paradas',         value: kpis.paradas,     color:'text-red-500'    },
    { label:'Inativas',        value: kpis.inativas,    color:'text-slate-400'  },
    { label:'Divergentes',     value: kpis.divergentes, color:'text-amber-400'  },
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden select-none" style={tk.page}>

      {/* ── Header ── */}
      {headerCollapsed ? (
        /* Faixa mínima quando colapsado */
        <div
          className={`flex-shrink-0 flex items-center justify-between px-4 py-1 border-b ${tk.headerCls} cursor-pointer`}
          style={tk.headerStyle}
          onClick={() => setHeaderCollapsed(false)}
          title="Expandir cabeçalho"
        >
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tk.textMuted}`}>OPERIS</span>
          <ChevronDown size={14} className={tk.textMuted} />
        </div>
      ) : (
      <header className={`flex-shrink-0 flex items-center gap-3 px-6 py-3 border-b ${tk.headerCls}`} style={tk.headerStyle}>
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <OperisLogoFull variant={theme === 'light' ? 'light' : 'dark'} />
          {isPreview && (
            <span className="text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
              Visualização
            </span>
          )}
        </div>

        <div className={`h-6 w-px flex-shrink-0 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />

        {/* Toggle view */}
        <div className={`flex items-center gap-1 border rounded-xl p-1 flex-shrink-0 ${tk.toggleWrap}`}>
          <button
            onClick={() => setView('maquinas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'maquinas' ? tk.toggleActive : tk.toggleInactive}`}
          >
            <LayoutGrid size={13} /> Máquinas
          </button>
          <button
            onClick={() => setView('comparativo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'comparativo' ? tk.toggleActive : tk.toggleInactive}`}
          >
            <BarChart3 size={13} /> Comparativo
          </button>
        </div>

        <div className="flex-1" />

        {/* Toggle dark/light */}
        <div className={`flex items-center gap-1 border rounded-xl p-1 flex-shrink-0 ${tk.toggleWrap}`}>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'dark' ? tk.toggleActive : tk.toggleInactive}`}
            title="Tema escuro"
          >
            <Moon size={13} /> Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'light' ? tk.toggleActive : tk.toggleInactive}`}
            title="Tema claro"
          >
            <Sun size={13} /> Light
          </button>
        </div>

        <div className={`h-6 w-px flex-shrink-0 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />

        {/* Relógio + Ao vivo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`hidden md:flex items-center gap-1.5 text-xs ${tk.textMuted}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
            <span>Ao vivo</span>
          </div>
          <LiveClock theme={theme} />
        </div>

        <div className={`h-6 w-px flex-shrink-0 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />

        {/* Colapsar header */}
        <button
          onClick={() => setHeaderCollapsed(true)}
          title="Ocultar cabeçalho"
          className={`flex-shrink-0 p-2 rounded-xl border transition-colors ${tk.exitBtn}`}
        >
          <ChevronUp size={14} />
        </button>

        {/* Sair da TV */}
        <button
          onClick={handleExit}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${tk.exitBtn} ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ transition: 'opacity 0.4s ease' }}
        >
          <Minimize2 size={14} /> Sair da TV
        </button>
      </header>
      )}{/* fim do else headerCollapsed */}

      {/* ── Conteúdo + Sidebar KPI ── */}
      <main className="flex-1 overflow-hidden flex min-h-0">

        {/* Área principal */}
        <div className="flex-1 overflow-hidden px-5 py-4 min-w-0 relative">
          {view === 'maquinas' ? (
            <TvScrollGrid snapshots={snapshots} theme={theme} />
          ) : (
            <TvComparativo theme={theme} kpis={kpis} />
          )}
        </div>

        {/* ── Sidebar KPI (só na view máquinas) ── */}
        {view === 'maquinas' && (
          <div className="flex-shrink-0 flex">

            {/* Tab de toggle */}
            <button
              onClick={() => setKpiOpen(!kpiOpen)}
              className={`w-8 flex-shrink-0 flex flex-col items-center justify-center gap-2 border-l transition-colors ${
                theme === 'dark'
                  ? 'border-white/8 hover:bg-white/5 text-slate-400 hover:text-white'
                  : 'border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-700'
              }`}
            >
              <span
                className={`text-[9px] font-bold uppercase tracking-widest select-none ${tk.textMuted}`}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                KPIs
              </span>
              {kpiOpen
                ? <ChevronRight size={12} />
                : <ChevronLeft size={12} />}
            </button>

            {/* Painel de KPIs */}
            <div
              style={{ width: kpiOpen ? 184 : 0, overflow: 'hidden', transition: 'width 0.3s ease', flexShrink: 0 }}
            >
              <div
                className={`h-full flex flex-col gap-2 p-3 border-l overflow-y-auto ${tk.borderColor}`}
                style={{ ...tk.headerStyle, width: 184, minWidth: 184 }}
              >
                <p className={`text-[9px] font-bold uppercase tracking-[0.14em] px-1 mb-1 ${tk.textMuted}`}>Status operacional</p>

                {kpiStrip.map((k) => (
                  <div
                    key={k.label}
                    className={`rounded-xl border px-3 py-2.5 flex flex-col ${
                      theme === 'dark' ? 'bg-white/[0.05] border-white/10' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <p className={`text-3xl font-light tabular-nums leading-none ${k.color}`}>{k.value}</p>
                    <p className={`text-[10px] font-semibold mt-1.5 leading-snug ${tk.textMuted}`}>{k.label}</p>
                  </div>
                ))}

                {/* Separador + Total */}
                <div className={`h-px mt-1 ${theme === 'dark' ? 'bg-white/8' : 'bg-gray-200'}`} />
                <div
                  className={`rounded-xl border px-3 py-2.5 flex flex-col ${
                    theme === 'dark' ? 'bg-white/[0.05] border-white/10' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <p className={`text-3xl font-light tabular-nums leading-none ${tk.textPrimary}`}>{kpis.total}</p>
                  <p className={`text-[10px] font-semibold mt-1.5 leading-snug ${tk.textMuted}`}>Total de máquinas</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── Ticker de alertas (só view máquinas) ── */}
      {view === 'maquinas' && MOCK_ALERTS.length > 0 && (
        <footer className={`flex-shrink-0 border-t flex items-center gap-0 overflow-hidden ${tk.footerBorder}`} style={tk.headerStyle}>
          {/* Label fixo */}
          <div className={`flex items-center gap-1.5 px-4 py-2.5 flex-shrink-0 border-r ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
            <TrendingUp size={13} className="text-red-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-500">Alertas</span>
          </div>
          {/* Trilho animado */}
          <div className="flex-1 overflow-hidden">
            <div className="tv-ticker-track">
              {/* duplicado para loop seamless */}
              {[...MOCK_ALERTS, ...MOCK_ALERTS].map((a, i) => (
                <span key={i} className={`inline-flex items-center gap-2 text-xs whitespace-nowrap px-6 py-2.5 ${tk.textMuted}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    a.sev === 'danger' ? 'bg-red-500' :
                    a.sev === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <span className={`font-bold ${tk.textSecondary}`}>{a.machine}</span>
                  <span>{a.title}</span>
                  <span className={`mx-4 ${theme === 'dark' ? 'text-white/10' : 'text-gray-200'}`}>◆</span>
                </span>
              ))}
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
