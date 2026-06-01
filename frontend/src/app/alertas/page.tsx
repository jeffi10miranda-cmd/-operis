'use client';

import Link from 'next/link';
import { useContagemAlertas } from '@/lib/api';
import { PageLoading } from '@/components/skeleton';

type Contagem = {
  total: number;
  critico: number;
  atencao: number;
  info: number;
};

// Mock para modo preview (sem backend)
const MOCK_CONTAGEM: Contagem = { total: 8, critico: 3, atencao: 3, info: 2 };

export default function AlertasPage() {
  const { data, isLoading, error } = useContagemAlertas();
  const previewMode = !data && !isLoading;
  const c = (data as Contagem | undefined) ?? MOCK_CONTAGEM;

  const cards = [
    {
      label: 'Críticos',
      value: c.critico,
      desc: 'Ação imediata na linha',
      accent: 'border-l-red-500',
      valueClass: 'text-red-600',
    },
    {
      label: 'Importantes',
      value: c.atencao,
      desc: 'Impacto relevante no turno',
      accent: 'border-l-orange-500',
      valueClass: 'text-orange-600',
    },
    {
      label: 'Atenção',
      value: Math.max(0, c.atencao - Math.floor(c.atencao / 2)),
      desc: 'Monitorar evolução',
      accent: 'border-l-amber-400',
      valueClass: 'text-amber-600',
    },
    {
      label: 'Informativos',
      value: c.info,
      desc: 'Sem impacto imediato',
      accent: 'border-l-slate-400',
      valueClass: 'text-slate-600',
    },
    {
      label: 'Total de alertas',
      value: c.total,
      desc: 'Não lidos no período',
      accent: 'border-l-[var(--operis-petroleum)]',
      valueClass: 'text-[var(--operis-petroleum)]',
    },
  ];

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6 max-w-5xl">
      {previewMode && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          Modo visualização — dados de exemplo. Conecte o backend para contagem real.
        </p>
      )}

      <p className="text-sm text-slate-500 leading-relaxed">
        Visão executiva de severidade. Detalhes operacionais estão na{' '}
        <Link href="/central" className="text-[var(--operis-accent)] font-semibold hover:underline">Central</Link>
        {' '}e no{' '}
        <Link href="/logs" className="text-[var(--operis-accent)] font-semibold hover:underline">Log</Link>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`card border-l-4 ${card.accent} px-6 py-8 flex flex-col gap-3 min-h-[160px] justify-center`}
          >
            <p className="kpi-corporate__label">{card.label}</p>
            <p className={`text-5xl font-light tabular-nums leading-none ${card.valueClass}`}>
              {card.value}
            </p>
            <p className="text-xs text-slate-400">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
