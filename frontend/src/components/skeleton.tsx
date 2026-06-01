'use client';

import { type ReactNode } from 'react';

// ─── Primitivo ────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
  );
}

// ─── KPI Card skeleton ────────────────────────────────────────────────────────
export function KPICardSkeleton() {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-2.5 w-8" />
      </div>
    </div>
  );
}

// ─── Machine Card skeleton ────────────────────────────────────────────────────
export function MachineCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="w-5 h-5 rounded" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[0,1,2].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === 0 ? 'w-24' : 'flex-1'}`} />
      ))}
    </div>
  );
}

// ─── Alert item skeleton ──────────────────────────────────────────────────────
export function AlertItemSkeleton() {
  return (
    <div className="card p-4 flex items-start gap-4">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-3 w-12 flex-shrink-0" />
    </div>
  );
}

// ─── Page loading overlay ─────────────────────────────────────────────────────
export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-operis-dark border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}

// ─── Central page skeleton ────────────────────────────────────────────────────
export function CentralSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <MachineCardSkeleton key={i} />)}
          </div>
        </div>
        <div className="card p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-200 mb-4">{icon}</div>
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
