'use client';

import { useState, useMemo } from 'react';
import { useHistorico } from '@/lib/api';
import { Search, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

type Turno = 'TODOS' | 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';

interface LinhaHistorico {
  idx:       number;
  maquina:   string;
  turno:     string;
  op:        string | null;
  descricao: string | null;
  qtdOP:     number | null;
  qtdAtual:  number | null;
  ciclo:     number | null;
  cicloReal: number | null;
  cav:       number | null;
  cavFec:    number | null;
  status:    string;
  divergente: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  EM_PRODUCAO:          'Ok',
  SETUP:                'Setup',
  SETUP_DE_COR:         'Setup de Cor',
  REGULAGEM:            'Regulagem',
  MANUTENCAO:           'Manutenção',
  FERRAMENTARIA:        'Ferramentaria',
  AGUARDANDO_MP:        'Aguard. MP',
  AGUARDANDO_TECNICO:   'Aguard. Técnico',
  AGUARDANDO_LIBERACAO: 'Aguard. Liberação',
  AGUARDANDO_ESTUFAGEM: 'Aguard. Estufagem',
  REINICIO:             'Reinício',
  TRYOUT:               'Tryout',
  TROCA_DE_VERSAO:      'Troca de Versão',
  FORA_DA_COR_PADRAO:   'Fora da Cor',
  FALTA_DE_OPERADOR:    'Falta Operador',
  PARADA_PLANEJADA:     'Parada Plan.',
  INATIVA:              'Inativa',
};

function statusColor(status: string, divergente: boolean): string {
  if (status === 'EM_PRODUCAO' && !divergente) return 'bg-green-50 text-green-700';
  if (status === 'EM_PRODUCAO' && divergente)  return 'bg-amber-50 text-amber-700';
  if (['MANUTENCAO','FERRAMENTARIA'].includes(status)) return 'bg-red-100 text-red-700';
  if (status.startsWith('AGUARDANDO'))         return 'bg-orange-50 text-orange-700';
  if (['SETUP','SETUP_DE_COR','FORA_DA_COR_PADRAO'].includes(status)) return 'bg-amber-50 text-amber-700';
  if (status === 'INATIVA')                    return 'bg-slate-50 text-slate-500';
  return 'bg-purple-50 text-purple-700';
}

const TURNO_LABEL: Record<string, string> = {
  TODOS: 'Todos',
  PRIMEIRO: '1º Turno',
  SEGUNDO:  '2º Turno',
  TERCEIRO: '3º Turno',
};

function fmtNum(v: number | null) {
  if (v == null) return <span className="text-gray-300">—</span>;
  return v.toLocaleString('pt-BR');
}

function fmtDec(v: number | null) {
  if (v == null) return <span className="text-gray-300">—</span>;
  return v.toFixed(1).replace('.', ',');
}

export default function HistoricoPage() {
  const hoje  = new Date().toISOString().slice(0, 10);
  const [data,        setData]        = useState(hoje);
  const [turno,       setTurno]       = useState<Turno>('TODOS');
  const [busca,       setBusca]       = useState('');
  const [todasOPs,    setTodasOPs]    = useState(false);

  const { data: raw, isLoading } = useHistorico(data, turno, todasOPs);
  const linhas: LinhaHistorico[] = raw ?? [];

  function exportarExcel() {
    const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
    const turnoFmt = TURNO_LABEL[turno] ?? turno;

    const rows = filtradas.map(l => ({
      '#':         l.idx,
      'Máq':       l.maquina.replace(/\D+/g, ''),
      'Turno':     TURNO_LABEL[l.turno] ?? l.turno,
      'OP':        l.op ?? '',
      'Descrição': l.descricao ?? '',
      'Qtd OP':    l.qtdOP ?? '',
      'Qtd Atual': l.qtdAtual ?? '',
      'Ciclo':     l.ciclo ?? '',
      'C Real':    l.cicloReal ?? '',
      'Cav':       l.cav ?? '',
      'Cav Fec':   l.cavFec ?? '',
      'Status':    STATUS_LABEL[l.status] ?? l.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Larguras das colunas
    ws['!cols'] = [
      { wch: 4 }, { wch: 5 }, { wch: 10 }, { wch: 8 }, { wch: 36 },
      { wch: 10 }, { wch: 10 }, { wch: 7 }, { wch: 7 }, { wch: 6 }, { wch: 8 }, { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');

    const nomeArquivo = `Historico_OPERIS_${data}_${turno === 'TODOS' ? 'Todos' : turnoFmt.replace(/\s/g,'')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  }

  const filtradas = useMemo(() => {
    if (!busca.trim()) return linhas;
    const q = busca.toLowerCase();
    return linhas.filter(l =>
      l.maquina.toLowerCase().includes(q) ||
      l.descricao?.toLowerCase().includes(q) ||
      l.op?.toLowerCase().includes(q) ||
      STATUS_LABEL[l.status]?.toLowerCase().includes(q)
    );
  }, [linhas, busca]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Data</label>
          <input
            type="date"
            value={data}
            max={hoje}
            onChange={e => setData(e.target.value)}
            className="input text-sm w-40"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Turno</label>
          <select
            value={turno}
            onChange={e => setTurno(e.target.value as Turno)}
            className="input text-sm w-40"
          >
            {(['TODOS','PRIMEIRO','SEGUNDO','TERCEIRO'] as Turno[]).map(t => (
              <option key={t} value={t}>{TURNO_LABEL[t]}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Buscar</label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Máquina, produto, OP..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input text-sm pl-8 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-[14px]">
          <input
            type="checkbox"
            id="chkTodasOPs"
            checked={todasOPs}
            onChange={e => setTodasOPs(e.target.checked)}
            className="rounded border-gray-300 text-operis-dark focus:ring-operis-dark w-4 h-4 cursor-pointer"
          />
          <label htmlFor="chkTodasOPs" className="text-xs text-gray-600 font-medium cursor-pointer">
            Incluir OPs finalizadas
          </label>
        </div>

        <div className="ml-auto flex items-end gap-3">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Registros</p>
            <p className="text-lg font-bold text-operis-dark">{filtradas.length}</p>
          </div>

          <button
            onClick={exportarExcel}
            disabled={filtradas.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d6f42] text-white text-sm font-semibold hover:bg-[#155c36] disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet size={15} /> Importar pro Excel
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1a3a2a] text-white">
                {['#','Máq','Turno','OP','Descrição','Qtd OP','Qtd Atual','Ciclo','C Real','Cav','Cav Fec','Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-white/10 last:border-r-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-10 text-gray-400">Nenhum registro para esta data.</td></tr>
              ) : (
                filtradas.map((l, i) => {
                  const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  const cicloDiff = l.ciclo && l.cicloReal ? l.cicloReal - l.ciclo : null;
                  const cicloColor = cicloDiff == null ? '' : cicloDiff > l.ciclo! * 0.05 ? 'text-red-600 font-bold' : cicloDiff < -l.ciclo! * 0.05 ? 'text-blue-600' : '';
                  const cavFecColor = l.cavFec != null && l.cavFec > 0 ? 'text-red-600 font-bold' : '';
                  return (
                    <tr key={`${l.maquina}-${l.turno}`} className={`${rowBg} hover:bg-blue-50 transition-colors border-b border-gray-100`}>
                      <td className="px-3 py-2 text-gray-400 tabular-nums">{l.idx}</td>
                      <td className="px-3 py-2 font-bold text-operis-dark tabular-nums">{l.maquina.replace(/\D+/g,'')}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{TURNO_LABEL[l.turno] ?? l.turno}</td>
                      <td className="px-3 py-2 tabular-nums text-gray-700">{l.op ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate text-gray-800" title={l.descricao ?? ''}>{l.descricao ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 tabular-nums text-right">{fmtNum(l.qtdOP)}</td>
                      <td className="px-3 py-2 tabular-nums text-right font-semibold">{fmtNum(l.qtdAtual)}</td>
                      <td className="px-3 py-2 tabular-nums text-right text-gray-500">{fmtDec(l.ciclo)}</td>
                      <td className={`px-3 py-2 tabular-nums text-right ${cicloColor}`}>{fmtDec(l.cicloReal)}</td>
                      <td className="px-3 py-2 tabular-nums text-right text-gray-600">{fmtNum(l.cav)}</td>
                      <td className={`px-3 py-2 tabular-nums text-right ${cavFecColor}`}>{l.cavFec != null ? l.cavFec : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${statusColor(l.status, l.divergente)}`}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
