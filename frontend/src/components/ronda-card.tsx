'use client';

import { useState, useEffect } from 'react';
import {
  Play, Settings, Gauge, AlertCircle, Clock, StopCircle, Power,
  Droplets, RotateCcw, Wrench, PowerOff, CheckCircle2, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatusSelectModal, MOTIVOS_PARADA } from './status-select-modal';

const STATUS_CFG: Record<string, { label: string; pill: string; icon: React.ElementType; dot: string }> = {
  EM_PRODUCAO:          { label: 'Em Produção',         pill: 'bg-green-500 text-white',    icon: Play,        dot: 'bg-green-500' },
  SETUP:                { label: 'Setup',                pill: 'bg-amber-400 text-white',    icon: Settings,    dot: 'bg-amber-400' },
  SETUP_DE_COR:         { label: 'Setup de Cor',         pill: 'bg-amber-400 text-white',    icon: Droplets,    dot: 'bg-amber-400' },
  REGULAGEM:            { label: 'Regulagem',            pill: 'bg-purple-500 text-white',   icon: Gauge,       dot: 'bg-purple-500' },
  MANUTENCAO:           { label: 'Manutenção',           pill: 'bg-red-500 text-white',      icon: Wrench,      dot: 'bg-red-500' },
  FERRAMENTARIA:        { label: 'Ferramentaria',        pill: 'bg-red-500 text-white',      icon: Wrench,      dot: 'bg-red-500' },
  AGUARDANDO_MP:        { label: 'Aguardando MP',        pill: 'bg-orange-400 text-white',   icon: Clock,       dot: 'bg-orange-400' },
  AGUARDANDO_TECNICO:   { label: 'Aguardando Técnico',   pill: 'bg-orange-400 text-white',   icon: Clock,       dot: 'bg-orange-400' },
  AGUARDANDO_LIBERACAO: { label: 'Aguardando Liberação', pill: 'bg-orange-400 text-white',   icon: Clock,       dot: 'bg-orange-400' },
  AGUARDANDO_ESTUFAGEM: { label: 'Aguardando Estufagem', pill: 'bg-orange-400 text-white',   icon: Clock,       dot: 'bg-orange-400' },
  PARADA:               { label: 'Parada',               pill: 'bg-red-600 text-white',      icon: StopCircle,  dot: 'bg-red-600' },
  INATIVA:              { label: 'Inativa',              pill: 'bg-slate-400 text-white',    icon: Power,       dot: 'bg-slate-400' },
  REINICIO:             { label: 'Reinício',             pill: 'bg-purple-400 text-white',   icon: RotateCcw,   dot: 'bg-purple-400' },
  TRYOUT:               { label: 'Tryout',               pill: 'bg-purple-500 text-white',   icon: Gauge,       dot: 'bg-purple-500' },
  TROCA_DE_VERSAO:      { label: 'Troca de Versão',      pill: 'bg-amber-400 text-white',    icon: Settings,    dot: 'bg-amber-400' },
  FORA_DA_COR_PADRAO:   { label: 'Fora da Cor Padrão',   pill: 'bg-amber-500 text-white',    icon: AlertCircle, dot: 'bg-amber-500' },
  FALTA_DE_OPERADOR:    { label: 'Falta de Operador',    pill: 'bg-rose-500 text-white',     icon: Clock,       dot: 'bg-rose-500' },
  PARADA_PLANEJADA:     { label: 'Parada Planejada',     pill: 'bg-slate-500 text-white',    icon: StopCircle,  dot: 'bg-slate-500' },
};

const FICHA_OPCOES = [
  { value: 'Certa',      bg: 'bg-green-500 text-white', inactive: 'bg-white text-gray-400 border border-gray-200 hover:border-green-400' },
  { value: 'Errada',     bg: 'bg-red-500 text-white',   inactive: 'bg-white text-gray-400 border border-gray-200 hover:border-red-400' },
  { value: 'Não consta', bg: 'bg-slate-400 text-white', inactive: 'bg-white text-gray-400 border border-gray-200 hover:border-slate-400' },
];

interface Snapshot {
  maquina: string;
  status: string;
  op?: string | null;
  qtdOP?: number | null;
  produtoNome?: string | null;
  produto?: { descricao: string; ciclopadrao: number; cavidadepadrao: number } | null;
  cicloAtual?: number | null;
  cavidadeReal?: number | null;
  qtdAtual?: number | null;
  observacao?: string | null;
  divergente?: boolean;
}

interface RondaCardProps {
  snapshot: Snapshot;
  produtos: { id: string; descricao: string; ciclopadrao: number; cavidadepadrao: number }[];
  onApontado?: () => void;
  data?: string;
  turno?: string;
}

function fmtNum(raw: string): string {
  if (!raw) return '';
  const n = Number(raw.replace(/[^\d]/g, ''));
  return isNaN(n) || raw === '' ? raw : n.toLocaleString('pt-BR');
}

export function RondaCard({ snapshot, produtos, onApontado, data, turno }: RondaCardProps) {
  const s = snapshot;
  const cfg = STATUS_CFG[s.status] ?? { label: s.status, pill: 'bg-slate-300 text-white', icon: Clock, dot: 'bg-slate-300' };

  const [status,       setStatus]       = useState(s.status);
  const [produto,      setProduto]       = useState(s.produtoNome || s.produto?.descricao || '');
  const [opNum,        setOpNum]         = useState(s.op || '');
  const [qtdOpVal,     setQtdOpVal]      = useState(s.qtdOP != null ? String(s.qtdOP) : '');
  const [cicloReal,    setCicloReal]     = useState(s.cicloAtual != null ? String(s.cicloAtual) : '');
  const [cavReal,      setCavReal]       = useState(s.cavidadeReal != null ? String(s.cavidadeReal) : '');
  const [qtdAcum,      setQtdAcum]       = useState(s.qtdAtual != null ? String(s.qtdAtual) : '');
  const [ficha,        setFicha]         = useState(s.observacao || '');
  const [showModal,    setShowModal]     = useState(false);
  const [salvando,     setSalvando]      = useState(false);
  const [apontado,     setApontado]      = useState(false);
  const [focusedNum,   setFocusedNum]    = useState<string | null>(null);

  // Atualiza campos quando o snapshot muda (nova sincronização)
  useEffect(() => {
    setStatus(s.status);
    setProduto(s.produtoNome || s.produto?.descricao || '');
    setOpNum(s.op || '');
    setQtdOpVal(s.qtdOP != null ? String(s.qtdOP) : '');
    setCicloReal(s.cicloAtual != null ? String(s.cicloAtual) : '');
    setCavReal(s.cavidadeReal != null ? String(s.cavidadeReal) : '');
    setQtdAcum(s.qtdAtual != null ? String(s.qtdAtual) : '');
    setFicha(s.observacao || '');
  }, [s.maquina, s.status]);

  const cfgAtual = STATUS_CFG[status] ?? cfg;
  const ativo = status !== 'INATIVA';
  const CfgIcon = cfgAtual.icon;
  const produtoSelecionado = produtos.find(p => p.descricao === produto);
  const cicloTarget  = produtoSelecionado?.ciclopadrao ?? s.produto?.ciclopadrao ?? null;
  const cavTarget    = produtoSelecionado?.cavidadepadrao ?? s.produto?.cavidadepadrao ?? null;
  const cicloNum     = cicloReal ? Number(cicloReal) : null;
  const cavNum       = cavReal   ? Number(cavReal)   : null;
  const qtdNum       = qtdAcum   ? Number(qtdAcum.replace(/\./g, '').replace(',', '.')) : null;

  const cicloBad = cicloNum && cicloTarget ? cicloNum > cicloTarget * 1.05 : false;
  const cavBad   = cavNum   && cavTarget   ? cavNum   < cavTarget           : false;

  async function handleApontar() {
    setSalvando(true);
    try {
      await api.patch(`/snapshots/maquina/${s.maquina}`, {
        status,
        op:          opNum      || undefined,
        qtdOP:       qtdOpVal   ? Number(qtdOpVal.replace(/\./g, '').replace(',', '.'))   : undefined,
        qtdAtual:    qtdNum     ?? undefined,
        observacao:  ficha      || undefined,
        ...(data  ? { data }  : {}),
        ...(turno ? { turno } : {}),
      });
      setApontado(true);
      setTimeout(() => setApontado(false), 2000);
      onApontado?.();
    } catch { /* silent */ }
    finally { setSalvando(false); }
  }

  return (
    <>
      {showModal && (
        <StatusSelectModal
          maquina={s.maquina}
          onSelect={(st) => { setStatus(st); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className={`machine-card flex flex-col gap-2 ${!ativo ? 'opacity-80' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${cfgAtual.dot}`} />
            <span className="machine-name font-bold">{s.maquina}</span>
          </div>
          <button
            onClick={() => ativo ? setShowModal(true) : setStatus('EM_PRODUCAO')}
            className={`p-1.5 rounded-lg transition-colors ${ativo ? 'text-green-500 hover:bg-red-50 hover:text-red-500' : 'text-slate-400 hover:bg-green-50 hover:text-green-500'}`}
            title={ativo ? 'Alterar status' : 'Ligar'}
          >
            {ativo ? <CfgIcon size={14} /> : <PowerOff size={14} />}
          </button>
        </div>

        {/* Status — clicável */}
        <button
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide w-fit ${cfgAtual.pill}`}
        >
          {cfgAtual.label}
        </button>

        {/* Produto — editável */}
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Produto</p>
          <select
            value={produto}
            onChange={e => setProduto(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="">Selecionar...</option>
            {produtos.filter(p => (p as any).ativo !== false).map(p => (
              <option key={p.id} value={p.descricao}>{p.descricao}</option>
            ))}
          </select>
        </div>

        {/* OP e Qtd OP — editáveis */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Nº OP</p>
            <input
              type="text"
              value={focusedNum === 'op' ? opNum : fmtNum(opNum)}
              onChange={e => setOpNum(e.target.value.replace(/[^\d]/g, ''))}
              onFocus={() => setFocusedNum('op')}
              onBlur={() => setFocusedNum(null)}
              placeholder="Ex: 34028"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Qtd a realizar</p>
            <input
              type="text"
              value={focusedNum === 'qtdop' ? qtdOpVal : fmtNum(qtdOpVal)}
              onChange={e => setQtdOpVal(e.target.value.replace(/[^\d]/g, ''))}
              onFocus={() => setFocusedNum('qtdop')}
              onBlur={() => setFocusedNum(null)}
              placeholder="Total"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Ciclo e Cavidade — editáveis */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">
              Ciclo real {cicloTarget ? <span className="text-gray-300">/ {cicloTarget}s</span> : ''}
            </p>
            <div className="relative">
              <input
                type="number"
                value={cicloReal}
                onChange={e => setCicloReal(e.target.value)}
                placeholder="seg"
                className={`w-full text-xs border rounded-lg px-2 py-1.5 pr-5 focus:outline-none ${cicloBad ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-400'}`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">s</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">
              Cav. real {cavTarget ? <span className="text-gray-300">/ {cavTarget}</span> : ''}
            </p>
            <input
              type="number"
              value={cavReal}
              onChange={e => setCavReal(e.target.value)}
              placeholder="qtd"
              className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none ${cavBad ? 'border-orange-400 bg-orange-50' : 'border-gray-200 focus:border-blue-400'}`}
            />
          </div>
        </div>

        {/* QTD Acumulada */}
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">QTD Acumulada</p>
          <input
            type="text"
            value={focusedNum === 'qtd' ? qtdAcum : fmtNum(qtdAcum)}
            onChange={e => setQtdAcum(e.target.value.replace(/[^\d]/g, ''))}
            onFocus={() => setFocusedNum('qtd')}
            onBlur={() => setFocusedNum(null)}
            placeholder="Quantidade"
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Ficha Técnica */}
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Ficha Técnica</p>
          <div className="flex gap-1">
            {FICHA_OPCOES.map(op => (
              <button
                key={op.value}
                onClick={() => setFicha(op.value)}
                className={`flex-1 text-[10px] font-bold px-1 py-1 rounded-lg transition-colors ${ficha.toLowerCase() === op.value.toLowerCase() ? op.bg : op.inactive}`}
              >
                {op.value}
              </button>
            ))}
          </div>
        </div>

        {/* Botão Apontar */}
        <button
          onClick={handleApontar}
          disabled={salvando}
          className={`w-full py-2 rounded-xl text-xs font-bold tracking-wide transition-colors mt-1 ${
            apontado
              ? 'bg-green-500 text-white'
              : 'bg-operis-dark text-white hover:opacity-90 disabled:opacity-50'
          }`}
        >
          {salvando ? (
            <span className="flex items-center justify-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Salvando...</span>
          ) : apontado ? (
            <span className="flex items-center justify-center gap-1.5"><CheckCircle2 size={12} /> Apontado!</span>
          ) : (
            'APONTAR'
          )}
        </button>
      </div>
    </>
  );
}
