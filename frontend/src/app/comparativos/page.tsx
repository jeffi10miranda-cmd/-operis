'use client';

import { useMemo, useState } from 'react';
import { useComparativoDias, useComparativoTurnos } from '@/lib/api';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight,
  BarChart3, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

// ─── Mock data ────────────────────────────────────────────────────────────────
const kpiMetrics = [
  { label: 'Ciclo médio',       value: '23,4s', delta: '+2,1s', deltaPct: '+9,9%', up: true,  sparkColor: '#ef4444' },
  { label: 'Produção total',    value: '18.450 un', delta: '+1.480', deltaPct: '+8,7%', up: true, sparkColor: '#22c55e' },
  { label: 'Setup / Ajustes',   value: '11h 23m', delta: '+1h 12m', deltaPct: '+11,2%', up: true, sparkColor: '#f59e0b' },
  { label: 'Paradas',           value: '5h 45m', delta: '-0h 30m', deltaPct: '-8,0%', up: false, sparkColor: '#22c55e' },
  { label: 'Disponibilidade',   value: '86,3%', delta: '-2,4%', deltaPct: '', up: false, sparkColor: '#ef4444' },
  { label: 'Eficiência média',  value: '76,8%', delta: '+3,6%', deltaPct: '', up: true,  sparkColor: '#22c55e' },
];

const sparkData = Array.from({ length: 12 }, (_, i) => ({ v: 40 + Math.sin(i * 0.8) * 12 + Math.random() * 6 }));

const mainTableData = [
  { maquina:'MÁQ 01', produto:'Frasco reto 12', cicloAnt:'50s', cicloAt:'55s', deltaCiclo:'+5s (10%)',   cavAnt:24, cavAt:24, deltaCav:'-',  prodAnt:2450, prodAt:2680, deltaProd:'+9,4%', status:'Ciclo aumentou', statusType:'danger' },
  { maquina:'MÁQ 02', produto:'Tampa Kelly - Preto', cicloAnt:'20s', cicloAt:'20s', deltaCiclo:'-',    cavAnt:16, cavAt:16, deltaCav:'-',  prodAnt:1920, prodAt:1980, deltaProd:'+3,1%', status:'Estável',        statusType:'ok' },
  { maquina:'MÁQ 03', produto:'Haste 48 mm',    cicloAnt:'30s', cicloAt:'33s', deltaCiclo:'+3s (10%)',   cavAnt:28, cavAt:32, deltaCav:'+4', prodAnt:2100, prodAt:2050, deltaProd:'-2,4%', status:'Cavidade alterada',statusType:'warning' },
  { maquina:'MÁQ 04', produto:'Frasco reto 05', cicloAnt:'24s', cicloAt:'24s', deltaCiclo:'-',           cavAnt:'-', cavAt:'-',deltaCav:'-',  prodAnt:0,    prodAt:0,    deltaProd:'-',     status:'Máquina parada', statusType:'stopped' },
  { maquina:'MÁQ 05', produto:'Peneira - Rosa', cicloAnt:'22s', cicloAt:'25s', deltaCiclo:'+3s (13,6%)', cavAnt:16, cavAt:16, deltaCav:'-',  prodAnt:1650, prodAt:1520, deltaProd:'-7,9%', status:'Ciclo aumentou', statusType:'danger' },
  { maquina:'MÁQ 06', produto:'POTE 500g',      cicloAnt:'24s', cicloAt:'24s', deltaCiclo:'-',           cavAnt:16, cavAt:16, deltaCav:'-',  prodAnt:2300, prodAt:2450, deltaProd:'+6,5%', status:'Estável',        statusType:'ok' },
  { maquina:'MÁQ 07', produto:'TAMPA 38mm',     cicloAnt:'24s', cicloAt:'26s', deltaCiclo:'+2s (8,3%)',  cavAnt:16, cavAt:16, deltaCav:'-',  prodAnt:1800, prodAt:1880, deltaProd:'+4,4%', status:'Ciclo aumentou', statusType:'warning' },
  { maquina:'MÁQ 08', produto:'GARRAFA PET',    cicloAnt:'20s', cicloAt:'20s', deltaCiclo:'-',           cavAnt:32, cavAt:32, deltaCav:'-',  prodAnt:2230, prodAt:1890, deltaProd:'-15,2%',status:'Queda produção', statusType:'danger' },
];

const barData = [
  { turno:'1º Turno', anterior:5200, atual:4800 },
  { turno:'2º Turno', anterior:6100, atual:7200 },
  { turno:'3º Turno', anterior:5800, atual:6450 },
];

const lineData = [
  { t:'19/05 00:00', anterior:20, atual:22 },
  { t:'19/05 06:00', anterior:22, atual:24 },
  { t:'19/05 12:00', anterior:21, atual:26 },
  { t:'19/05 18:00', anterior:23, atual:25 },
  { t:'20/05 00:00', anterior:22, atual:27 },
];

const pieData = [
  { name:'Em produção',  value:18, color:'#22c55e' },
  { name:'Setup/Ajustes',value:5,  color:'#f59e0b' },
  { name:'Regulagem',    value:3,  color:'#a855f7' },
  { name:'Aguardando',   value:4,  color:'#f97316' },
  { name:'Paradas',      value:3,  color:'#ef4444' },
  { name:'Inativas',     value:2,  color:'#94a3b8' },
];

const variacoes = [
  { label:'Ciclo médio aumentou',      sub:'+2,1s em relação ao período anterior', delta:'+9,9%', up:true,  color:'bg-red-500' },
  { label:'Produção total aumentou',   sub:'+1.480 unidades produzidas',           delta:'+8,7%', up:true,  color:'bg-green-500' },
  { label:'Setup / Ajustes aumentou',  sub:'+1h 12m em relação ao período anterior',delta:'+11,2%',up:true, color:'bg-amber-500' },
  { label:'Paradas reduziram',         sub:'-0h 30m em relação ao período anterior',delta:'-8,0%', up:false, color:'bg-green-500' },
];

const statusConfig: Record<string, { label: string; cls: string }> = {
  ok:      { label:'Estável',          cls:'bg-green-100 text-green-700' },
  warning: { label:'Atenção',          cls:'bg-amber-100 text-amber-700' },
  danger:  { label:'Ciclo aumentou',   cls:'bg-red-100 text-red-700' },
  stopped: { label:'Máquina parada',   cls:'bg-slate-100 text-slate-600' },
};

const TABS = ['Resumo geral','Máquinas','Produtos','Turnos','Status','Tendências','Insights'] as const;
type Tab = typeof TABS[number];

// ─── Page ─────────────────────────────────────────────────────────────────────
type ComparativoApiRow = {
  maquina: string;
  anterior: { produto: string; ciclo: string; cavidade: string | number; status: string } | null;
  atual: { produto: string; ciclo: string; cavidade: string | number; status: string } | null;
  resultado: string;
  tipo: 'ok' | 'info' | 'warning' | 'danger';
  alterado: boolean;
};

function mapComparativoRow(row: ComparativoApiRow) {
  return {
    maquina: row.maquina,
    produto: row.atual?.produto ?? row.anterior?.produto ?? '—',
    cicloAnt: row.anterior?.ciclo ?? '—',
    cicloAt: row.atual?.ciclo ?? '—',
    deltaCiclo: row.alterado ? row.resultado : '—',
    cavAnt: row.anterior?.cavidade ?? '—',
    cavAt: row.atual?.cavidade ?? '—',
    deltaCav: '—',
    prodAnt: 0,
    prodAt: 0,
    deltaProd: '—',
    status: row.resultado,
    statusType: row.tipo === 'danger' ? 'danger' : row.tipo === 'warning' ? 'warning' : row.tipo === 'info' ? 'ok' : 'ok',
  };
}

export default function ComparativosPage() {
  const [tab, setTab]             = useState<Tab>('Resumo geral');
  const [tipoAnalise, setTipo]    = useState('Comparativo de dias');
  const [periodoA, setPeriodoA]   = useState('2026-05-19');
  const [periodoB, setPeriodoB]   = useState('2026-05-20');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 8;

  const isDias = tipoAnalise === 'Comparativo de dias';
  const isTurnos = tipoAnalise === 'Comparativo de turnos';

  const { data: diasData, isLoading: diasLoading, error: diasError } = useComparativoDias(
    isDias ? periodoA : undefined,
    isDias ? periodoB : undefined,
  );
  const { data: turnosData, isLoading: turnosLoading, error: turnosError } = useComparativoTurnos(
    isTurnos ? periodoB : undefined,
  );

  const tableRows = useMemo(() => {
    setPage(1);
    if (isDias && Array.isArray(diasData) && diasData.length > 0) {
      return (diasData as ComparativoApiRow[]).map(mapComparativoRow);
    }
    return mainTableData;
  }, [isDias, diasData]);

  const apiLoading = (isDias && diasLoading) || (isTurnos && turnosLoading);
  const apiError = diasError || turnosError;
  const tabsComDados: Tab[] = ['Resumo geral', 'Máquinas'];

  const TOTAL_PAGES = Math.max(1, Math.ceil(tableRows.length / PER_PAGE));
  const rowsPagina  = tableRows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-4">

      {/* ── Filter bar ── */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        {/* Tipo análise */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Tipo de análise</label>
          <select
            value={tipoAnalise}
            onChange={(e) => setTipo(e.target.value)}
            className="input text-xs w-52"
          >
            <option>Comparativo de turnos</option>
            <option>Comparativo de dias</option>
            <option>Comparativo de semanas</option>
            <option>Comparativo de meses</option>
          </select>
        </div>

        {/* Período A */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Período inicial</label>
          <input type="date" value={periodoA} onChange={(e) => setPeriodoA(e.target.value)} className="input text-xs w-40" />
        </div>

        {/* Período B */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Período final</label>
          <input type="date" value={periodoB} onChange={(e) => setPeriodoB(e.target.value)} className="input text-xs w-40" />
        </div>

        {/* Turno */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Turno</label>
          <select className="input text-xs w-40">
            <option>Todos os turnos</option>
            <option>1º Turno</option>
            <option>2º Turno</option>
            <option>3º Turno</option>
          </select>
        </div>

        {/* Máquina */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Máquina</label>
          <select className="input text-xs w-44">
            <option>Todas as máquinas</option>
            {tableRows.map((r) => <option key={r.maquina}>{r.maquina}</option>)}
          </select>
        </div>

        <button className="btn-primary text-xs gap-2 mt-4 ml-auto">
          <Filter size={13} />Aplicar filtros
        </button>
      </div>

      {apiError && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          Não foi possível carregar comparativos da API. Exibindo dados de exemplo.
        </div>
      )}
      {apiLoading && (
        <p className="text-xs text-gray-400">Carregando comparativos...</p>
      )}

      {/* ── KPI metric cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiMetrics.map((m) => (
          <div key={m.label} className="card p-4 space-y-2">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{m.label}</p>
            <p className="text-2xl font-black text-operis-dark leading-none">{m.value}</p>
            <div className="flex items-center gap-1">
              {m.up
                ? <TrendingUp size={12} className="text-red-500 flex-shrink-0" />
                : <TrendingDown size={12} className="text-green-500 flex-shrink-0" />}
              <span className={`text-[11px] font-bold ${m.up ? 'text-red-500' : 'text-green-600'}`}>
                {m.delta}{m.deltaPct ? ` (${m.deltaPct})` : ''}
              </span>
            </div>
            {/* Mini spark */}
            <ResponsiveContainer width="100%" height={28}>
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke={m.sparkColor} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-0 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
              tab === t
                ? 'border-operis-dark text-operis-dark'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Resumo Geral ── */}
      {(tab === 'Resumo geral' || tab === 'Máquinas') && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

          {/* Left: main table */}
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-operis-dark">Comparativo principal</p>
                <p className="text-xs text-gray-400">Resumo das principais variações entre os períodos selecionados.</p>
              </div>

              {/* Table head */}
              <div className="grid grid-cols-[1fr_1fr_0.8fr_0.7fr_0.7fr_0.8fr_1fr_0.9fr_0.9fr_1fr] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                <span>Máquina</span>
                <span>Produto</span>
                <span>Ciclo ant.</span>
                <span>Ciclo at.</span>
                <span className="text-center">Cav. ant.</span>
                <span className="text-center">Cav. at.</span>
                <span className="text-right">Prod. ant.</span>
                <span className="text-right">Prod. at.</span>
                <span className="text-right">Variação</span>
                <span className="text-center">Status</span>
              </div>

              {/* Rows */}
              {rowsPagina.map((row) => {
                const sCfg = statusConfig[row.statusType] ?? statusConfig.ok;
                const isDanger = row.deltaCiclo !== '-' && row.statusType === 'danger';
                return (
                  <div key={row.maquina} className="grid grid-cols-[1fr_1fr_0.8fr_0.7fr_0.7fr_0.8fr_1fr_0.9fr_0.9fr_1fr] gap-2 px-5 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50 transition-colors">
                    <span className="text-xs font-bold text-operis-dark">{row.maquina}</span>
                    <span className="text-xs text-gray-500 truncate">{row.produto}</span>
                    <span className="text-xs text-gray-500">{row.cicloAnt}</span>
                    <span className="text-xs font-semibold text-gray-800">{row.cicloAt}</span>
                    <span className="text-xs text-gray-500 text-center">{typeof row.cavAnt === 'number' ? row.cavAnt : row.cavAnt}</span>
                    <span className="text-xs font-semibold text-gray-800 text-center">{typeof row.cavAt === 'number' ? row.cavAt : row.cavAt}</span>
                    <span className="text-xs text-gray-500 text-right">{row.prodAnt.toLocaleString('pt-BR')}</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">{row.prodAt.toLocaleString('pt-BR')}</span>
                    <span className={`text-xs font-bold ${row.deltaProd.startsWith('+') ? 'text-green-600' : row.deltaProd === '-' ? 'text-gray-400' : 'text-red-500'}`}>
                      {row.deltaProd}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center ${sCfg.cls}`}>
                      {row.status}
                    </span>
                  </div>
                );
              })}

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Exibindo {(page-1)*PER_PAGE + 1}–{Math.min(page*PER_PAGE, tableRows.length)} de {tableRows.length} máquinas
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" disabled={page === 1}>
                    <ChevronLeft size={14} className="text-gray-500" />
                  </button>
                  {Array.from({length: Math.min(TOTAL_PAGES, 5)}, (_,i) => {
                    const pg = page <= 3 ? i+1 : page + i - 2;
                    return pg > 0 && pg <= TOTAL_PAGES ? (
                      <button key={pg} onClick={() => setPage(pg)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${page === pg ? 'bg-operis-dark text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {pg}
                      </button>
                    ) : null;
                  })}
                  <button onClick={() => setPage(p => Math.min(TOTAL_PAGES, p+1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" disabled={page === TOTAL_PAGES}>
                    <ChevronRight size={14} className="text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom charts row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Bar: produção por turno */}
              <div className="card p-4">
                <p className="text-xs font-bold text-operis-dark mb-0.5">Produção por turno</p>
                <p className="text-[10px] text-gray-400 mb-3">Comparativo de produção (unidades)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={barData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="turno" tick={{ fontSize: 9 }} stroke="#ccc"/>
                    <YAxis tick={{ fontSize: 9 }} stroke="#ccc"/>
                    <Tooltip contentStyle={{ fontSize:10, borderRadius:8 }}/>
                    <Bar dataKey="anterior" fill="#e2e8f0" name="Anterior" radius={[3,3,0,0]}/>
                    <Bar dataKey="atual"    fill="#0f3b52" name="Atual"    radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-3 h-2 bg-slate-200 rounded-sm"/> Anterior</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-3 h-2 bg-operis-dark rounded-sm"/> Atual</span>
                </div>
              </div>

              {/* Line: disponibilidade e eficiência */}
              <div className="card p-4">
                <p className="text-xs font-bold text-operis-dark mb-0.5">Disponibilidade e eficiência</p>
                <p className="text-[10px] text-gray-400 mb-3">Evolução dos indicadores (%)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="t" tick={{ fontSize: 8 }} stroke="#ccc"/>
                    <YAxis tick={{ fontSize: 8 }} stroke="#ccc" domain={[0, 100]}/>
                    <Tooltip contentStyle={{ fontSize:10, borderRadius:8 }}/>
                    <Line type="monotone" dataKey="anterior" stroke="#cbd5e1" strokeWidth={1.5} dot={false} name="Anterior" strokeDasharray="4 2"/>
                    <Line type="monotone" dataKey="atual"    stroke="#22c55e" strokeWidth={2}   dot={false} name="Atual"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Donut: distribuição status */}
              <div className="card p-4">
                <p className="text-xs font-bold text-operis-dark mb-3">Distribuição de status</p>
                <div className="relative flex items-center justify-center" style={{ height: 100 }}>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-operis-dark">30</span>
                    <span className="text-[9px] text-gray-400">Total</span>
                  </div>
                </div>
                <div className="space-y-1 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }}/>
                        {d.name}
                      </span>
                      <span className="font-bold">{d.value} ({Math.round(d.value/30*100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Evolução ciclo */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-operis-dark">Evolução do ciclo médio</p>
                <select className="input text-[10px] w-32 py-1 min-h-0 h-7">
                  <option>Agrupado por: Hora</option>
                  <option>Agrupado por: Dia</option>
                </select>
              </div>
              <div className="flex gap-4 mb-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-4 h-px border-b-2 border-dashed border-slate-300 inline-block"/>Período anterior</span>
                <span className="flex items-center gap-1"><span className="w-4 h-px bg-operis-dark inline-block"/>Período atual</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="t" tick={{ fontSize: 8 }} stroke="#ccc"/>
                  <YAxis tick={{ fontSize: 8 }} stroke="#ccc"/>
                  <Tooltip contentStyle={{ fontSize:10, borderRadius:8 }}/>
                  <Line type="monotone" dataKey="anterior" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
                  <Line type="monotone" dataKey="atual"    stroke="#0f3b52" strokeWidth={2}   dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Principais variações */}
            <div className="card p-4">
              <p className="text-xs font-bold text-operis-dark mb-3">Principais variações</p>
              <div className="space-y-2">
                {variacoes.map((v) => (
                  <div key={v.label} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${v.color}`}>
                        {v.up ? <TrendingUp size={13} className="text-white"/> : <TrendingDown size={13} className="text-white"/>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{v.label}</p>
                        <p className="text-[10px] text-gray-400">{v.sub}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black flex-shrink-0 ${v.up ? 'text-red-500' : 'text-green-600'}`}>
                      {v.delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Turnos' && isTurnos && Array.isArray(turnosData) && turnosData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-operis-dark">Comparativo por turno — {periodoB}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(turnosData as { maquina: string; turno1: unknown; turno2: unknown; turno3: unknown; divergencias: number }[]).slice(0, 20).map((row) => (
              <div key={row.maquina} className="px-5 py-3 flex items-center justify-between text-xs">
                <span className="font-bold text-operis-dark">{row.maquina}</span>
                <span className="text-gray-500">{row.divergencias} divergência(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!tabsComDados.includes(tab) && !(tab === 'Turnos' && isTurnos && Array.isArray(turnosData) && turnosData.length > 0) && (
        <div className="card p-12 text-center text-gray-400">
          <BarChart3 size={32} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm font-medium">Seção em desenvolvimento</p>
          <p className="text-xs mt-1">Módulo <strong>{tab}</strong> em evolução — use &quot;Resumo geral&quot; ou &quot;Máquinas&quot; com comparativo de dias.</p>
        </div>
      )}
    </div>
  );
}
