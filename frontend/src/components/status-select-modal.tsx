'use client';

import { X } from 'lucide-react';

export const MOTIVOS_PARADA = [
  { status: 'EM_PRODUCAO',          label: 'Em Produção',           cor: 'bg-green-500' },
  { status: 'SETUP',                label: 'Setup',                 cor: 'bg-amber-400' },
  { status: 'SETUP_DE_COR',         label: 'Troca de Cor',          cor: 'bg-amber-400' },
  { status: 'TRYOUT',               label: 'Try Out',               cor: 'bg-purple-500' },
  { status: 'TROCA_DE_VERSAO',      label: 'Troca de Versão',       cor: 'bg-amber-500' },
  { status: 'REGULAGEM',            label: 'Regulagem',             cor: 'bg-purple-500' },
  { status: 'FERRAMENTARIA',        label: 'Ferramentaria',         cor: 'bg-red-500' },
  { status: 'MANUTENCAO',           label: 'Manutenção',            cor: 'bg-red-500' },
  { status: 'AGUARDANDO_MP',        label: 'Aguardando MP',         cor: 'bg-orange-400' },
  { status: 'AGUARDANDO_TECNICO',   label: 'Aguardando Técnico',    cor: 'bg-orange-400' },
  { status: 'AGUARDANDO_LIBERACAO', label: 'Aguardando Liberação',  cor: 'bg-orange-400' },
  { status: 'AGUARDANDO_ESTUFAGEM', label: 'Aguardando Estufagem',  cor: 'bg-orange-400' },
  { status: 'FALTA_DE_OPERADOR',    label: 'Falta de Operador',     cor: 'bg-rose-500' },
  { status: 'PARADA_PLANEJADA',     label: 'Parada Planejada',      cor: 'bg-slate-500' },
  { status: 'REINICIO',             label: 'Reinício',              cor: 'bg-purple-400' },
  { status: 'FORA_DA_COR_PADRAO',   label: 'Fora da Cor Padrão',    cor: 'bg-amber-500' },
  { status: 'INATIVA',              label: 'Inativa',               cor: 'bg-slate-400' },
] as const;

interface Props {
  maquina: string;
  onSelect: (status: string) => void;
  onClose: () => void;
}

export function StatusSelectModal({ maquina, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-operis-dark">Alterar Status</h2>
            <p className="text-xs text-slate-500">Máquina {maquina}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {MOTIVOS_PARADA.map((m) => (
            <button
              key={m.status}
              onClick={() => onSelect(m.status)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.cor}`} />
              <span className="text-xs font-semibold text-slate-700 leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
