'use client';

import { useState } from 'react';
import { useAlertas, useContagemAlertas } from '@/lib/api';
import { PageLoading } from '@/components/skeleton';
import { AlertTriangle, Info, CheckCircle, Bell, Clock } from 'lucide-react';

type Contagem = { total: number; critico: number; atencao: number; info: number };

type Alerta = {
  id: string;
  maquina: string;
  tipo: string;
  severidade: 'CRITICO' | 'ATENCAO' | 'INFO';
  titulo: string;
  descricao: string;
  lido: boolean;
  criadoEm: string;
};

const MOCK_CONTAGEM: Contagem = { total: 8, critico: 3, atencao: 3, info: 2 };

const SEV_CONFIG = {
  CRITICO: { label: 'Crítico',    bg: 'bg-red-50',    border: 'border-l-red-500',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    icon: AlertTriangle },
  ATENCAO: { label: 'Atenção',    bg: 'bg-orange-50', border: 'border-l-orange-400',  text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', icon: Bell },
  INFO:    { label: 'Informativo', bg: 'bg-slate-50',  border: 'border-l-slate-400',   text: 'text-slate-600',  badge: 'bg-slate-100 text-slate-600',  icon: Info },
};

const TIPO_LABEL: Record<string, string> = {
  CICLO_ACIMA:        'Ciclo acima do padrão',
  CICLO_ABAIXO:       'Ciclo abaixo do padrão',
  CAVIDADE_ABAIXO:    'Cavidade abaixo do padrão',
  TROCA_PRODUTO:      'Troca de produto',
  MAQUINA_PARADA:     'Máquina parada',
  SETUP_EXCESSIVO:    'Setup excessivo',
  RECORRENCIA:        'Recorrência',
  DIVERGENCIA_PADRAO: 'Divergência de padrão',
  NOVO_OP:            'Novo OP',
  SEM_LEITURA:        'Sem leitura',
};

function formatTipo(tipo: string) {
  return TIPO_LABEL[tipo] ?? tipo.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const PER_PAGE = 50;

export default function AlertasPage() {
  const [filtroSev, setFiltroSev] = useState<string>('TODOS');
  const [apenasNaoLidos, setApenasNaoLidos] = useState(false);
  const [page, setPage] = useState(1);

  const { data: contagem, isLoading: loadingCount } = useContagemAlertas();
  const { data: alertasData, isLoading: loadingList } = useAlertas({
    severidade: filtroSev !== 'TODOS' ? filtroSev : undefined,
    lido:       apenasNaoLidos ? false : undefined,
    page,
    limit:      PER_PAGE,
  });

  const c = (contagem as Contagem | undefined) ?? MOCK_CONTAGEM;
  const raw = alertasData as any;
  const alertas: Alerta[] = Array.isArray(raw) ? raw
    : Array.isArray(raw?.items)   ? raw.items
    : Array.isArray(raw?.alertas) ? raw.alertas
    : [];
  const totalServer: number = raw?.total ?? alertas.length;
  const totalPages = Math.ceil(totalServer / PER_PAGE);
  const alertasPagina = alertas;

  if (loadingCount && loadingList) return <PageLoading />;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Cards de contagem */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Críticos',     value: c.critico, accent: 'border-l-red-500',    valueClass: 'text-red-600'    },
          { label: 'Atenção',      value: c.atencao, accent: 'border-l-orange-400', valueClass: 'text-orange-600' },
          { label: 'Informativos', value: c.info,    accent: 'border-l-slate-400',  valueClass: 'text-slate-500'  },
          { label: 'Total',        value: c.total,   accent: 'border-l-[var(--operis-petroleum)]', valueClass: 'text-[var(--operis-petroleum)]' },
        ].map(card => (
          <div key={card.label} className={`card border-l-4 ${card.accent} px-5 py-5 flex flex-col gap-1`}>
            <p className="text-xs text-slate-500 font-medium">{card.label}</p>
            <p className={`text-4xl font-light tabular-nums ${card.valueClass}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {['TODOS', 'CRITICO', 'ATENCAO', 'INFO'].map(f => (
          <button
            key={f}
            onClick={() => { setFiltroSev(f); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filtroSev === f
                ? 'bg-[var(--operis-petroleum)] text-white border-transparent'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : f === 'CRITICO' ? 'Críticos' : f === 'ATENCAO' ? 'Atenção' : 'Informativos'}
          </button>
        ))}
        <button
          onClick={() => { setApenasNaoLidos(v => !v); setPage(1); }}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ml-auto ${
            apenasNaoLidos
              ? 'bg-[var(--operis-petroleum)] text-white border-transparent'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          Não lidos
        </button>
      </div>

      {/* Lista de alertas */}
      {!loadingList && alertasPagina.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle className="mx-auto mb-3 text-green-400" size={32} />
          <p className="text-sm text-slate-500">Nenhum alerta encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertasPagina.map(a => {
            const cfg = SEV_CONFIG[a.severidade] ?? SEV_CONFIG.INFO;
            const Icon = cfg.icon;
            return (
              <div
                key={a.id}
                className={`card border-l-4 ${cfg.border} ${cfg.bg} px-4 py-3 flex gap-3 items-start ${a.lido ? 'opacity-60' : ''}`}
              >
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-operis-dark">{a.maquina}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{formatTipo(a.tipo)}</span>
                    {a.lido && <span className="text-xs text-slate-400">• lido</span>}
                  </div>
                  <p className={`text-sm font-semibold mt-0.5 ${cfg.text}`}>{a.titulo}</p>
                  {a.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 mt-0.5">
                  <Clock size={11} />
                  <span>{formatHora(a.criadoEm)}</span>
                </div>
              </div>
            );
          })}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, totalServer)} de {totalServer}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  ‹ Anterior
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  Próxima ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
