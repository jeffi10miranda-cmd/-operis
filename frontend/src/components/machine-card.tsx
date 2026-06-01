'use client';

import {
  Play, Settings, Gauge, AlertCircle, Clock, StopCircle, Power,
  Droplets, RotateCcw, Wrench,
} from 'lucide-react';

interface MachineCardProps {
  name: string;
  product: string;
  status: string;
  cycleCurrent?: number | null;
  cycleTarget?: number | null;
  cavityCurrent?: number | null;
  cavityTarget?: number | null;
  velocity?: number | null;
  divergent?: boolean;
  observation?: string | null;
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
};

const fallback = { label: '', pill: 'bg-slate-300 text-white', icon: Clock, dot: 'bg-slate-300' };

export function MachineCard({
  name, product, status,
  cycleCurrent, cycleTarget,
  cavityCurrent, cavityTarget,
  divergent, observation,
}: MachineCardProps) {
  const cfg = statusConfig[status] ?? { ...fallback, label: status };
  const StatusIcon = cfg.icon;

  const cycleOff =
    cycleCurrent && cycleTarget
      ? Math.round(((cycleCurrent - cycleTarget) / cycleTarget) * 100)
      : null;

  const cavityBad =
    cavityCurrent != null && cavityTarget != null && cavityCurrent < cavityTarget;

  const barColor =
    cycleOff === null || cycleOff === 0
      ? 'bg-green-500'
      : cycleOff > 0
        ? 'bg-red-400'
        : 'bg-blue-400';

  const barWidth = cycleOff === null ? 0 : Math.min(Math.abs(cycleOff) + 50, 100);

  return (
    <div className={`machine-card ${divergent ? 'ring-2 ring-amber-400' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <h3 className="machine-name">{name}</h3>
          </div>
        </div>
        <StatusIcon size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
      </div>

      {/* Status pill */}
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide mb-3 ${cfg.pill}`}>
        {cfg.label}
      </span>

      {/* Product */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Produto</p>
        <p className="machine-product font-semibold text-gray-800 text-sm mt-0.5">
          {product || '—'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center mb-3">
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

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>

      {/* Observation */}
      {observation && (
        <p className="text-[11px] text-gray-400 mt-2 line-clamp-1">💬 {observation}</p>
      )}
    </div>
  );
}
