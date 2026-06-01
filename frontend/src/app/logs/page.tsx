'use client';

import { useState } from 'react';
import { useLogs, type OperisLogEntry } from '@/lib/api';
import type { PaginatedResponse } from '@/types/operis';
import { PageLoading } from '@/components/skeleton';

const MODULOS = ['', 'SINCRONIZACAO', 'ALERTAS', 'PRODUTOS', 'USUARIOS', 'CONFIGURACAO', 'SISTEMA'];
const SEVERIDADES = ['', 'CRITICO', 'ATENCAO', 'INFO'];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const sevStyle: Record<string, string> = {
  CRITICO: 'bg-red-50 text-red-700 border-red-100',
  ATENCAO: 'bg-amber-50 text-amber-800 border-amber-100',
  INFO: 'bg-slate-50 text-slate-600 border-slate-100',
};

export default function LogsPage() {
  const [modulo, setModulo] = useState('');
  const [severidade, setSeveridade] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading, error } = useLogs({
    modulo: modulo || undefined,
    severidade: severidade || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    page: 1,
  });

  const logs = (data as PaginatedResponse<OperisLogEntry> | undefined)?.items ?? [];
  const total = (data as PaginatedResponse<OperisLogEntry> | undefined)?.total ?? 0;

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="operis-label">Módulo</label>
            <select className="input w-44 text-xs" value={modulo} onChange={(e) => setModulo(e.target.value)}>
              <option value="">Todos</option>
              {MODULOS.filter(Boolean).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="operis-label">Severidade</label>
            <select className="input w-36 text-xs" value={severidade} onChange={(e) => setSeveridade(e.target.value)}>
              <option value="">Todas</option>
              {SEVERIDADES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="operis-label">De</label>
            <input type="date" className="input w-40 text-xs" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="operis-label">Até</label>
            <input type="date" className="input w-40 text-xs" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          Log indisponível. Execute a migration do banco (`npx prisma migrate dev`) e reinicie o backend.
        </p>
      )}

      <p className="text-xs text-slate-500">
        <span className="font-semibold text-operis-dark">{total}</span> registros
      </p>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[140px_100px_120px_1fr_140px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Data/Hora</span>
          <span>Módulo</span>
          <span>Ação</span>
          <span>Descrição</span>
          <span>Usuário</span>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">Nenhum registro no período.</p>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[140px_100px_120px_1fr_140px] gap-3 px-5 py-3 border-b border-slate-50 last:border-0 items-start text-xs hover:bg-slate-50/80"
            >
              <span className="text-slate-500 tabular-nums">{formatDateTime(entry.createdAt)}</span>
              <span className={`font-semibold px-2 py-0.5 rounded border text-[10px] w-fit ${sevStyle[entry.severidade]}`}>
                {entry.modulo}
              </span>
              <span className="font-medium text-operis-dark">{entry.acao}</span>
              <span className="text-slate-600 leading-relaxed">{entry.descricao}</span>
              <span className="text-slate-400 truncate">{entry.usuario?.name ?? 'Sistema'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
