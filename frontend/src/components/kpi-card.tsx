'use client';

import { type ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  total?: number;
  color?: 'green' | 'amber' | 'purple' | 'orange' | 'red' | 'slate' | 'blue';
}

const barColors: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  purple: 'bg-purple-500',
  orange: 'bg-orange-400',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
};

const textColors: Record<string, string> = {
  green: 'text-green-600',
  amber: 'text-amber-500',
  purple: 'text-purple-600',
  orange: 'text-orange-500',
  red: 'text-red-600',
  slate: 'text-slate-500',
  blue: 'text-blue-600',
};

const iconBg: Record<string, string> = {
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-500',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-500',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-500',
  blue: 'bg-blue-50 text-blue-600',
};

export function KPICard({ label, value, icon, total, color = 'blue' }: KPICardProps) {
  const pct = total && typeof value === 'number' ? Math.round((value / total) * 100) : null;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold leading-none mb-2">
            {label}
          </p>
          <span className="text-3xl font-bold text-operis-dark leading-none">{value}</span>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[color]}`}>
            {icon}
          </div>
        )}
      </div>

      {pct !== null && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColors[color]}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-xs font-bold ${textColors[color]}`}>{pct}%</p>
        </div>
      )}
    </div>
  );
}
