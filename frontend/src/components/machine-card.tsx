'use client';

import { useState } from 'react';
import {
  Play, Settings, Gauge, AlertCircle, Clock, StopCircle, Power,
  Droplets, RotateCcw, Wrench, PowerOff, Check, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatusSelectModal } from './status-select-modal';

interface MachineCardProps {
  snapshotId?: string;
  maquina?: string;
  name: string;
  product: string;
  status: string;
  cycleCurrent?: number | null;
  cycleTarget?: number | null;
  cavityCurrent?: number | null;
  cavityTarget?: number | null;
  qtdAtual?: number | null;
  velocity?: number | null;
  divergent?: boolean;
  observation?: string | null;
  manualOverride?: boolean;
  onUpdated?: () => void;
}

const statusConfig: Record<string, { label: string; pill: string; icon: React.ElementType; dot: string }> = {
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

const fallback = { label: '', pill: 'bg-slate-300 text-white', icon: Clock, dot: 'bg-slate-300' };

const FICHA_OPCOES = [
  { value: 'Certa',     label: 'Certa',      bg: 'bg-green-500 text-white',  inactive: 'bg-white text-gray-400 border border-gray-200 hover:border-green-400 hover:text-green-600' },
  { value: 'Errada',    label: 'Errada',     bg: 'bg-red-500 text-white',    inactive: 'bg-white text-gray-400 border border-gray-200 hover:border-red-400 hover:text-red-600' },
  { value: 'Não consta', label: 'Não consta', bg: 'bg-slate-400 text-white',  inactive: 'bg-white text-gray-400 border border-gray-200 hover:border-slate-400 hover:text-slate-600' },
];

function FichaTecnicaToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const normalizado = value?.trim().toLowerCase();
  const atual = FICHA_OPCOES.find(o => o.value.toLowerCase() === normalizado);

  return (
    <div className="flex gap-1">
      {FICHA_OPCOES.map((op) => {
        const ativo = op.value.toLowerCase() === normalizado;
        return (
          <button
            key={op.value}
            onClick={() => onChange(op.value)}
            className={`flex-1 text-[10px] font-bold px-1 py-1 rounded-lg transition-colors ${ativo ? op.bg : op.inactive}`}
          >
            {op.label}
          </button>
        );
      })}
    </div>
  );
}

export function MachineCard({
  maquina, name, product, status,
  cycleCurrent, cycleTarget,
  cavityCurrent, cavityTarget,
  qtdAtual: qtdAtualProp,
  divergent, observation,
  manualOverride,
  onUpdated,
}: MachineCardProps) {
  const [localStatus, setLocalStatus]   = useState(status);
  const [localQtd, setLocalQtd]         = useState(qtdAtualProp ?? null);
  const [editingQtd, setEditingQtd]     = useState(false);
  const [qtdInput, setQtdInput]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [override, setOverride]         = useState(manualOverride ?? false);
  const [showModal, setShowModal]       = useState(false);
  const [localFicha, setLocalFicha]     = useState(observation ?? '');

  const cfg = statusConfig[localStatus] ?? { ...fallback, label: localStatus };
  const StatusIcon = cfg.icon;
  const ativo = localStatus !== 'INATIVA';

  const cycleOff =
    cycleCurrent && cycleTarget
      ? Math.round(((cycleCurrent - cycleTarget) / cycleTarget) * 100)
      : null;

  const cavityBad =
    cavityCurrent != null && cavityTarget != null && cavityCurrent < cavityTarget;

  const barColor =
    cycleOff === null || cycleOff === 0 ? 'bg-green-500'
    : cycleOff > 0 ? 'bg-red-400'
    : 'bg-blue-400';

  const barWidth = cycleOff === null ? 0 : Math.min(Math.abs(cycleOff) + 50, 100);

  async function handleToggle() {
    if (!maquina || loading) return;
    if (ativo) {
      // Máquina ligada → abre modal para escolher motivo
      setShowModal(true);
    } else {
      // Máquina parada → liga direto
      await aplicarStatus('EM_PRODUCAO');
    }
  }

  async function aplicarStatus(novoStatus: string) {
    if (!maquina) return;
    setLoading(true);
    setShowModal(false);
    try {
      await api.patch(`/snapshots/maquina/${maquina}`, { status: novoStatus });
      setLocalStatus(novoStatus);
      setOverride(true);
      onUpdated?.();
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleSaveQtd() {
    if (!maquina) return;
    const val = parseInt(qtdInput);
    if (isNaN(val)) { setEditingQtd(false); return; }
    setLoading(true);
    try {
      await api.patch(`/snapshots/maquina/${maquina}`, { qtdAtual: val });
      setLocalQtd(val);
      setEditingQtd(false);
      onUpdated?.();
    } catch { setEditingQtd(false); }
    finally { setLoading(false); }
  }

  return (
    <>
    {showModal && maquina && (
      <StatusSelectModal
        maquina={maquina}
        onSelect={aplicarStatus}
        onClose={() => setShowModal(false)}
      />
    )}
    <div className={`machine-card ${divergent ? 'ring-2 ring-amber-400' : ''} ${!ativo ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <h3 className="machine-name">{name}</h3>
          {override && <span className="text-[9px] text-amber-500 font-bold">MANUAL</span>}
        </div>
        {/* Toggle ligar/desligar */}
        {maquina && (
          <button
            onClick={handleToggle}
            disabled={loading}
            title={ativo ? 'Desligar máquina' : 'Ligar máquina'}
            className={`p-1.5 rounded-lg transition-colors ${
              ativo
                ? 'text-green-500 hover:bg-red-50 hover:text-red-500'
                : 'text-slate-400 hover:bg-green-50 hover:text-green-500'
            } disabled:opacity-40`}
          >
            {ativo ? <Power size={15} /> : <PowerOff size={15} />}
          </button>
        )}
      </div>

      {/* Status pill */}
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide mb-3 ${cfg.pill}`}>
        {cfg.label}
      </span>

      {/* Product */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Produto</p>
        <p className="machine-product font-semibold text-gray-800 text-sm mt-0.5">{product || '—'}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center mb-2">
        <div>
          <p className="text-[10px] text-gray-400">Ciclo atual</p>
          <p className="text-sm font-bold text-operis-dark">{cycleCurrent ? `${cycleCurrent}s` : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Ciclo padrão</p>
          <p className="text-sm font-bold text-operis-dark">{cycleTarget ? `${cycleTarget}s` : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Cavidade</p>
          <p className={`text-sm font-bold ${cavityBad ? 'text-red-500' : 'text-operis-dark'}`}>
            {cavityCurrent ?? '—'}{cavityTarget ? ` / ${cavityTarget}` : ''}
          </p>
        </div>
      </div>

      {/* Quantidade acumulada — editável */}
      <div className="mb-2">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Qtd acumulada</p>
        {editingQtd ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={qtdInput}
              onChange={e => setQtdInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveQtd(); if (e.key === 'Escape') setEditingQtd(false); }}
              className="w-20 text-sm font-bold border border-blue-400 rounded px-1 py-0.5 outline-none"
              autoFocus
            />
            <button onClick={handleSaveQtd} className="text-green-500 hover:text-green-600"><Check size={13} /></button>
            <button onClick={() => setEditingQtd(false)} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
          </div>
        ) : (
          <button
            onClick={() => { setQtdInput(String(localQtd ?? '')); setEditingQtd(true); }}
            className="text-sm font-bold text-operis-dark hover:text-blue-600 hover:underline transition-colors"
            title="Clique para editar"
          >
            {localQtd != null ? localQtd.toLocaleString('pt-BR') : '—'}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>

      {/* Ficha Técnica — seleção interativa */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Ficha Técnica</p>
        <FichaTecnicaToggle
          value={localFicha}
          onChange={async (v) => {
            if (!maquina) return;
            setLocalFicha(v);
            try { await api.patch(`/snapshots/maquina/${maquina}`, { observacao: v }); }
            catch { setLocalFicha(localFicha); }
          }}
        />
      </div>
    </div>
    </>
  );
}
