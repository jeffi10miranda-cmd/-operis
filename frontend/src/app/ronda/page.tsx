'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSnapshotsHoje, useProdutos, api } from '@/lib/api';
import { RondaCard } from '@/components/ronda-card';
import {
  Calendar, Search, Plus, Edit2, PowerOff, Trash2,
  CheckCircle2, AlertTriangle, AlertCircle,
  Package, ClipboardList, LayoutList, ArrowUpDown,
  ClipboardCheck, Save, RotateCcw, ChevronRight, Info,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────
type Turno = 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';
type StatusOp =
  | 'EM_PRODUCAO' | 'REGULAGEM' | 'SETUP' | 'SETUP_DE_COR'
  | 'FERRAMENTARIA' | 'MANUTENCAO' | 'AGUARDANDO_MP' | 'AGUARDANDO_TECNICO'
  | 'AGUARDANDO_LIBERACAO' | 'AGUARDANDO_ESTUFAGEM' | 'REINICIO'
  | 'TRYOUT' | 'TROCA_DE_VERSAO' | 'FORA_DA_COR_PADRAO' | 'INATIVA';

interface Produto {
  id: string;
  descricao: string;
  ciclopadrao: number;
  cavidadepadrao: number;
  ativo: boolean;
}

interface RegistroRonda {
  id: string;
  data: string;
  hora: string;
  turno: Turno;
  maquina: string;
  produto: string;
  cicloAtual: number | null;
  ciclopadrao: number | null;
  cavidadeAtual: number | null;
  cavidadepadrao: number | null;
  status: StatusOp;
  divergente: boolean;
  observacao?: string | null;
}

// ── Status config ─────────────────────────────
const STATUS_CFG: Record<string, { label: string; pill: string }> = {
  EM_PRODUCAO:          { label: 'Em Produção',         pill: 'bg-green-100 text-green-700' },
  REGULAGEM:            { label: 'Regulagem',            pill: 'bg-purple-100 text-purple-700' },
  SETUP:                { label: 'Setup',                pill: 'bg-amber-100 text-amber-700' },
  SETUP_DE_COR:         { label: 'Setup de Cor',         pill: 'bg-amber-100 text-amber-700' },
  FERRAMENTARIA:        { label: 'Ferramentaria',        pill: 'bg-red-100 text-red-700' },
  MANUTENCAO:           { label: 'Manutenção',           pill: 'bg-red-100 text-red-700' },
  AGUARDANDO_MP:        { label: 'Aguardando MP',        pill: 'bg-orange-100 text-orange-700' },
  AGUARDANDO_TECNICO:   { label: 'Aguardando Técnico',   pill: 'bg-orange-100 text-orange-700' },
  AGUARDANDO_LIBERACAO: { label: 'Aguardando Liberação', pill: 'bg-orange-100 text-orange-700' },
  AGUARDANDO_ESTUFAGEM: { label: 'Aguardando Estufagem', pill: 'bg-orange-100 text-orange-700' },
  REINICIO:             { label: 'Reinício',             pill: 'bg-blue-100 text-blue-700' },
  TRYOUT:               { label: 'Tryout',               pill: 'bg-purple-100 text-purple-700' },
  TROCA_DE_VERSAO:      { label: 'Troca de Versão',      pill: 'bg-amber-100 text-amber-700' },
  FORA_DA_COR_PADRAO:   { label: 'Fora da Cor Padrão',   pill: 'bg-amber-100 text-amber-700' },
  INATIVA:              { label: 'Inativa',              pill: 'bg-slate-100 text-slate-600' },
};

const TURNO_LABEL: Record<Turno, string> = {
  PRIMEIRO: '1º Turno',
  SEGUNDO:  '2º Turno',
  TERCEIRO: '3º Turno',
};

// ── Banco de produtos mock ────────────────────
const MOCK_PRODUTOS: Produto[] = [
  { id:'p01', descricao:'Frasco reto 12',            ciclopadrao:50,   cavidadepadrao:24,  ativo:true },
  { id:'p02', descricao:'Haste 48 mm',               ciclopadrao:30,   cavidadepadrao:32,  ativo:true },
  { id:'p03', descricao:'Peneira - Rosa',             ciclopadrao:22,   cavidadepadrao:16,  ativo:true },
  { id:'p04', descricao:'Tampa Kelly - Preto',        ciclopadrao:20,   cavidadepadrao:16,  ativo:true },
  { id:'p05', descricao:'Haste 31mm BT - Cinza',      ciclopadrao:20,   cavidadepadrao:32,  ativo:true },
  { id:'p06', descricao:'Tampa Cibeli C/R - Preto',   ciclopadrao:24,   cavidadepadrao:16,  ativo:true },
  { id:'p07', descricao:'Tampa Cibeli - Amarelo',     ciclopadrao:24,   cavidadepadrao:32,  ativo:true },
  { id:'p08', descricao:'Tampa Stick XL - Branco',    ciclopadrao:25,   cavidadepadrao:16,  ativo:true },
  { id:'p09', descricao:'Haste 55mm - Preto',         ciclopadrao:30,   cavidadepadrao:32,  ativo:true },
  { id:'p10', descricao:'Base Stick XL - Azul',       ciclopadrao:25,   cavidadepadrao:16,  ativo:true },
  { id:'p11', descricao:'Haste Flat 34,20 mm',        ciclopadrao:30,   cavidadepadrao:128, ativo:true },
  { id:'p12', descricao:'Tampa Novo Toque - Branco',  ciclopadrao:23,   cavidadepadrao:32,  ativo:true },
  { id:'p13', descricao:'Haste 67mm c/adaptador',     ciclopadrao:35,   cavidadepadrao:32,  ativo:true },
  { id:'p14', descricao:'Corpo Stick XL - Nude',      ciclopadrao:25,   cavidadepadrao:16,  ativo:true },
  { id:'p15', descricao:'Frasco reto 03',             ciclopadrao:55,   cavidadepadrao:24,  ativo:true },
  { id:'p16', descricao:'Frasco reto 05',             ciclopadrao:55,   cavidadepadrao:24,  ativo:true },
  { id:'p17', descricao:'Frasco reto 05 - Marrom',    ciclopadrao:55,   cavidadepadrao:16,  ativo:true },
  { id:'p18', descricao:'Pote',                       ciclopadrao:50,   cavidadepadrao:16,  ativo:true },
  { id:'p19', descricao:'Frasco reto 10 - Marrom',    ciclopadrao:50,   cavidadepadrao:24,  ativo:true },
  { id:'p20', descricao:'Tampa Verônica - Preto',     ciclopadrao:34,   cavidadepadrao:32,  ativo:true },
  { id:'p21', descricao:'Batoque BL 02 - Laranja',    ciclopadrao:25,   cavidadepadrao:32,  ativo:true },
  { id:'p22', descricao:'Haste 80mm c/adaptador',     ciclopadrao:35,   cavidadepadrao:32,  ativo:true },
  { id:'p23', descricao:'Batoque BL 03 Cônico',       ciclopadrao:15,   cavidadepadrao:16,  ativo:true },
  { id:'p24', descricao:'Frasco reto 06',             ciclopadrao:50,   cavidadepadrao:24,  ativo:true },
  { id:'p25', descricao:'Tampa Impala - Branco',      ciclopadrao:16,   cavidadepadrao:24,  ativo:true },
  { id:'p26', descricao:'Haste 38mm Redonda',         ciclopadrao:30,   cavidadepadrao:128, ativo:true },
  { id:'p27', descricao:'Tampa Amanda - Salmão',      ciclopadrao:14,   cavidadepadrao:32,  ativo:true },
  { id:'p28', descricao:'Trava da Peneira C/R',       ciclopadrao:25,   cavidadepadrao:32,  ativo:true },
  { id:'p29', descricao:'Tampa Cibeli C/R Fosca',     ciclopadrao:20,   cavidadepadrao:16,  ativo:true },
  { id:'p30', descricao:'Tampa Brilho Roll-on',       ciclopadrao:25,   cavidadepadrao:16,  ativo:true },
  { id:'p31', descricao:'Caneca Stick XL',            ciclopadrao:20,   cavidadepadrao:32,  ativo:true },
  { id:'p32', descricao:'Frasco reto 10 6ML',         ciclopadrao:25,   cavidadepadrao:16,  ativo:true },
  { id:'p33', descricao:'Batoque BL 03',              ciclopadrao:50,   cavidadepadrao:24,  ativo:true },
  { id:'p34', descricao:'Frasco reto 06 - Amarelo',   ciclopadrao:30,   cavidadepadrao:32,  ativo:true },
  { id:'p35', descricao:'Batoque BL 02',              ciclopadrao:50,   cavidadepadrao:24,  ativo:true },
  { id:'p36', descricao:'Haste 31mm Flat',            ciclopadrao:25,   cavidadepadrao:32,  ativo:true },
  { id:'p37', descricao:'Batoque BL 03 - Preto',      ciclopadrao:30,   cavidadepadrao:128, ativo:true },
  { id:'p38', descricao:'Tampa Stick XL - Marrom',    ciclopadrao:30,   cavidadepadrao:32,  ativo:true },
  { id:'p39', descricao:'Tampa Cibeli - Rosa',        ciclopadrao:25,   cavidadepadrao:16,  ativo:true },
  { id:'p40', descricao:'Haste 31mm BT - Branco',     ciclopadrao:24,   cavidadepadrao:16,  ativo:true },
  { id:'p41', descricao:'Tampa Amanda - Rosa',        ciclopadrao:20,   cavidadepadrao:16,  ativo:true },
  { id:'p42', descricao:'Peneira - Verde',            ciclopadrao:25,   cavidadepadrao:24,  ativo:true },
  { id:'p43', descricao:'Base Stick - Azul',          ciclopadrao:22,   cavidadepadrao:32,  ativo:true },
];

// ── Registros mock ────────────────────────────
const MOCK_REGISTROS: RegistroRonda[] = [
  // 2026-06-01 — 2º Turno
  { id:'r01', data:'2026-06-01', hora:'14:05', turno:'SEGUNDO', maquina:'MÁQ 01', produto:'Frasco reto 12',           cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  { id:'r02', data:'2026-06-01', hora:'14:07', turno:'SEGUNDO', maquina:'MÁQ 02', produto:'Tampa Kelly - Preto',       cicloAtual:20,  ciclopadrao:20,  cavidadeAtual:16, cavidadepadrao:16,  status:'SETUP',       divergente:false },
  { id:'r03', data:'2026-06-01', hora:'14:10', turno:'SEGUNDO', maquina:'MÁQ 03', produto:'Haste 48 mm',              cicloAtual:33,  ciclopadrao:30,  cavidadeAtual:32, cavidadepadrao:32,  status:'REGULAGEM',   divergente:true,  observacao:'Ciclo acima do padrão' },
  { id:'r04', data:'2026-06-01', hora:'14:12', turno:'SEGUNDO', maquina:'MÁQ 04', produto:'Frasco reto 05',           cicloAtual:null,ciclopadrao:55,  cavidadeAtual:null,cavidadepadrao:24, status:'MANUTENCAO',  divergente:false },
  { id:'r05', data:'2026-06-01', hora:'14:15', turno:'SEGUNDO', maquina:'MÁQ 05', produto:'Peneira - Rosa',           cicloAtual:25,  ciclopadrao:22,  cavidadeAtual:16, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:true,  observacao:'Ciclo 13% acima do padrão' },
  { id:'r06', data:'2026-06-01', hora:'14:18', turno:'SEGUNDO', maquina:'MÁQ 06', produto:'Haste 31mm BT - Cinza',    cicloAtual:20,  ciclopadrao:20,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r07', data:'2026-06-01', hora:'14:20', turno:'SEGUNDO', maquina:'MÁQ 07', produto:'Tampa Novo Toque - Branco',cicloAtual:23,  ciclopadrao:23,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r08', data:'2026-06-01', hora:'14:22', turno:'SEGUNDO', maquina:'MÁQ 08', produto:'Base Stick XL - Azul',     cicloAtual:28,  ciclopadrao:25,  cavidadeAtual:12, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:true,  observacao:'Ciclo e cavidade divergentes' },
  { id:'r09', data:'2026-06-01', hora:'14:25', turno:'SEGUNDO', maquina:'MÁQ 09', produto:'Tampa Cibeli C/R - Preto', cicloAtual:24,  ciclopadrao:24,  cavidadeAtual:16, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:false },
  { id:'r10', data:'2026-06-01', hora:'14:28', turno:'SEGUNDO', maquina:'MÁQ 10', produto:'Haste 55mm - Preto',       cicloAtual:30,  ciclopadrao:30,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  // 2026-06-01 — 1º Turno
  { id:'r11', data:'2026-06-01', hora:'06:10', turno:'PRIMEIRO', maquina:'MÁQ 01', produto:'Frasco reto 12',          cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  { id:'r12', data:'2026-06-01', hora:'06:12', turno:'PRIMEIRO', maquina:'MÁQ 02', produto:'Pote',                    cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:16, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:false },
  { id:'r13', data:'2026-06-01', hora:'06:15', turno:'PRIMEIRO', maquina:'MÁQ 03', produto:'Tampa Verônica - Preto',  cicloAtual:34,  ciclopadrao:34,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r14', data:'2026-06-01', hora:'06:18', turno:'PRIMEIRO', maquina:'MÁQ 04', produto:'Batoque BL 02 - Laranja', cicloAtual:25,  ciclopadrao:25,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r15', data:'2026-06-01', hora:'06:20', turno:'PRIMEIRO', maquina:'MÁQ 05', produto:'Haste Flat 34,20 mm',     cicloAtual:32,  ciclopadrao:30,  cavidadeAtual:128,cavidadepadrao:128, status:'EM_PRODUCAO', divergente:true,  observacao:'Ciclo acima do padrão' },
  { id:'r16', data:'2026-06-01', hora:'06:22', turno:'PRIMEIRO', maquina:'MÁQ 06', produto:'Frasco reto 06',          cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:24, cavidadepadrao:24,  status:'SETUP_DE_COR',divergente:false },
  // 2026-05-31 — 2º Turno
  { id:'r17', data:'2026-05-31', hora:'14:05', turno:'SEGUNDO', maquina:'MÁQ 01', produto:'Frasco reto 12',           cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  { id:'r18', data:'2026-05-31', hora:'14:08', turno:'SEGUNDO', maquina:'MÁQ 02', produto:'Tampa Impala - Branco',    cicloAtual:16,  ciclopadrao:16,  cavidadeAtual:20, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:true,  observacao:'Cavidade abaixo do padrão' },
  { id:'r19', data:'2026-05-31', hora:'14:11', turno:'SEGUNDO', maquina:'MÁQ 03', produto:'Caneca Stick XL',          cicloAtual:20,  ciclopadrao:20,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r20', data:'2026-05-31', hora:'14:14', turno:'SEGUNDO', maquina:'MÁQ 04', produto:'Tampa Brilho Roll-on',     cicloAtual:25,  ciclopadrao:25,  cavidadeAtual:16, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:false },
  { id:'r21', data:'2026-05-31', hora:'14:17', turno:'SEGUNDO', maquina:'MÁQ 05', produto:'Haste 38mm Redonda',       cicloAtual:30,  ciclopadrao:30,  cavidadeAtual:128,cavidadepadrao:128, status:'EM_PRODUCAO', divergente:false },
  { id:'r22', data:'2026-05-31', hora:'14:20', turno:'SEGUNDO', maquina:'MÁQ 06', produto:'Batoque BL 03 Cônico',     cicloAtual:18,  ciclopadrao:15,  cavidadeAtual:16, cavidadepadrao:16,  status:'REGULAGEM',   divergente:true,  observacao:'Ciclo 20% acima do padrão' },
  { id:'r23', data:'2026-05-31', hora:'14:23', turno:'SEGUNDO', maquina:'MÁQ 07', produto:'Base Stick - Azul',        cicloAtual:22,  ciclopadrao:22,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r24', data:'2026-05-31', hora:'14:26', turno:'SEGUNDO', maquina:'MÁQ 08', produto:'Peneira - Verde',          cicloAtual:25,  ciclopadrao:25,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  // 2026-05-31 — 3º Turno
  { id:'r25', data:'2026-05-31', hora:'22:05', turno:'TERCEIRO', maquina:'MÁQ 01', produto:'Frasco reto 10 - Marrom', cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  { id:'r26', data:'2026-05-31', hora:'22:08', turno:'TERCEIRO', maquina:'MÁQ 02', produto:'Haste 80mm c/adaptador',  cicloAtual:35,  ciclopadrao:35,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r27', data:'2026-05-31', hora:'22:12', turno:'TERCEIRO', maquina:'MÁQ 03', produto:'Tampa Cibeli - Amarelo',  cicloAtual:24,  ciclopadrao:24,  cavidadeAtual:28, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:true,  observacao:'Cavidade abaixo do padrão' },
  { id:'r28', data:'2026-05-31', hora:'22:15', turno:'TERCEIRO', maquina:'MÁQ 04', produto:'Tampa Amanda - Salmão',   cicloAtual:14,  ciclopadrao:14,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r29', data:'2026-05-31', hora:'22:18', turno:'TERCEIRO', maquina:'MÁQ 05', produto:'Frasco reto 06 - Amarelo',cicloAtual:35,  ciclopadrao:30,  cavidadeAtual:32, cavidadepadrao:32,  status:'REGULAGEM',   divergente:true,  observacao:'Ciclo acima do padrão' },
  { id:'r30', data:'2026-05-31', hora:'22:22', turno:'TERCEIRO', maquina:'MÁQ 06', produto:'Batoque BL 02',           cicloAtual:50,  ciclopadrao:50,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  // 2026-05-30
  { id:'r31', data:'2026-05-30', hora:'14:05', turno:'SEGUNDO', maquina:'MÁQ 01', produto:'Frasco reto 03',           cicloAtual:55,  ciclopadrao:55,  cavidadeAtual:24, cavidadepadrao:24,  status:'EM_PRODUCAO', divergente:false },
  { id:'r32', data:'2026-05-30', hora:'14:08', turno:'SEGUNDO', maquina:'MÁQ 02', produto:'Tampa Stick XL - Marrom',  cicloAtual:33,  ciclopadrao:30,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:true,  observacao:'Ciclo 10% acima do padrão' },
  { id:'r33', data:'2026-05-30', hora:'14:12', turno:'SEGUNDO', maquina:'MÁQ 03', produto:'Haste 31mm Flat',          cicloAtual:25,  ciclopadrao:25,  cavidadeAtual:32, cavidadepadrao:32,  status:'EM_PRODUCAO', divergente:false },
  { id:'r34', data:'2026-05-30', hora:'14:15', turno:'SEGUNDO', maquina:'MÁQ 04', produto:'Tampa Cibeli - Rosa',      cicloAtual:25,  ciclopadrao:25,  cavidadeAtual:16, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:false },
  { id:'r35', data:'2026-05-30', hora:'06:10', turno:'PRIMEIRO', maquina:'MÁQ 01', produto:'Tampa Amanda - Rosa',     cicloAtual:20,  ciclopadrao:20,  cavidadeAtual:16, cavidadepadrao:16,  status:'EM_PRODUCAO', divergente:false },
  { id:'r36', data:'2026-05-30', hora:'06:13', turno:'PRIMEIRO', maquina:'MÁQ 02', produto:'Frasco reto 10 6ML',      cicloAtual:27,  ciclopadrao:25,  cavidadeAtual:16, cavidadepadrao:16,  status:'REGULAGEM',   divergente:true,  observacao:'Ciclo 8% acima do padrão' },
  { id:'r37', data:'2026-05-30', hora:'06:16', turno:'PRIMEIRO', maquina:'MÁQ 03', produto:'Batoque BL 03 - Preto',   cicloAtual:30,  ciclopadrao:30,  cavidadeAtual:128,cavidadepadrao:128, status:'EM_PRODUCAO', divergente:false },
];

// ── Helpers ───────────────────────────────────
function formatData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });
}

function cicloDelta(atual: number | null, padrao: number | null) {
  if (!atual || !padrao) return null;
  return Math.round(((atual - padrao) / padrao) * 100);
}

function validacaoCiclo(atual: number | null, padrao: number | null) {
  const d = cicloDelta(atual, padrao);
  if (d === null) return null;
  if (d > 5)  return 'acima';
  if (d < -5) return 'abaixo';
  return 'ok';
}

function validacaoCavidade(atual: number | null, padrao: number | null) {
  if (atual === null || padrao === null) return null;
  if (atual < padrao) return 'abaixo';
  return 'ok';
}

// ── Sub-componentes ───────────────────────────
function ValidacaoBadge({ ciclo, cavidade }: { ciclo: string | null; cavidade: string | null }) {
  const ambosOk   = ciclo === 'ok' && cavidade === 'ok';
  const semDados  = ciclo === null && cavidade === null;

  if (semDados) return <span className="text-gray-300 text-xs">—</span>;
  if (ambosOk)  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
      <CheckCircle2 size={13} /> Dentro do padrão
    </span>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {ciclo === 'acima' && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
          <AlertCircle size={12} /> Ciclo acima
        </span>
      )}
      {ciclo === 'abaixo' && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
          <AlertCircle size={12} /> Ciclo abaixo
        </span>
      )}
      {cavidade === 'abaixo' && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600">
          <AlertTriangle size={12} /> Cav. abaixo
        </span>
      )}
    </div>
  );
}

function CicloCell({ atual, padrao }: { atual: number | null; padrao: number | null }) {
  const v = validacaoCiclo(atual, padrao);
  const d = cicloDelta(atual, padrao);
  return (
    <div className="text-xs">
      <span className={`font-bold ${v === 'acima' ? 'text-red-600' : v === 'abaixo' ? 'text-blue-600' : 'text-gray-800'}`}>
        {atual ? `${atual}s` : '—'}
      </span>
      <span className="text-gray-400 ml-1">{padrao ? `/ ${padrao}s` : ''}</span>
      {d !== null && d !== 0 && (
        <span className={`ml-1 text-[10px] font-semibold ${d > 0 ? 'text-red-500' : 'text-blue-500'}`}>
          {d > 0 ? `+${d}%` : `${d}%`}
        </span>
      )}
    </div>
  );
}

function CavidadeCell({ atual, padrao }: { atual: number | null; padrao: number | null }) {
  const bad = atual !== null && padrao !== null && atual < padrao;
  return (
    <div className="text-xs">
      <span className={`font-bold ${bad ? 'text-orange-600' : 'text-gray-800'}`}>
        {atual ?? '—'}
      </span>
      <span className="text-gray-400 ml-1">{padrao ? `/ ${padrao}` : ''}</span>
    </div>
  );
}

// ── Tab: Registros ────────────────────────────
type PeriodoFiltro = 'hoje' | '7dias' | '30dias' | 'personalizado';

function TabRegistros() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('7dias');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim]       = useState('');
  const [busca, setBusca]           = useState('');
  const [turnoFiltro, setTurnoFiltro]   = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [somenteDiverg, setSomenteDiverg] = useState(false);
  const [sortField, setSortField] = useState<'data' | 'maquina'>('data');
  const [sortDesc, setSortDesc]   = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const periodoChips: { key: PeriodoFiltro; label: string }[] = [
    { key: 'hoje',          label: 'Hoje' },
    { key: '7dias',         label: '7 dias' },
    { key: '30dias',        label: '30 dias' },
    { key: 'personalizado', label: 'Personalizado' },
  ];

  const registrosFiltrados = useMemo(() => {
    let list = [...MOCK_REGISTROS];

    // Período
    const hoje = '2026-06-01';
    if (periodo === 'hoje')   list = list.filter(r => r.data === hoje);
    if (periodo === '7dias')  list = list.filter(r => r.data >= '2026-05-26');
    if (periodo === '30dias') list = list.filter(r => r.data >= '2026-05-02');
    if (periodo === 'personalizado') {
      if (dataInicio) list = list.filter(r => r.data >= dataInicio);
      if (dataFim)    list = list.filter(r => r.data <= dataFim);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(r =>
        r.maquina.toLowerCase().includes(q) ||
        r.produto.toLowerCase().includes(q),
      );
    }
    if (turnoFiltro)    list = list.filter(r => r.turno === turnoFiltro);
    if (statusFiltro)   list = list.filter(r => r.status === statusFiltro);
    if (somenteDiverg)  list = list.filter(r => r.divergente);

    list.sort((a, b) => {
      const va = sortField === 'data' ? `${a.data}${a.hora}` : a.maquina;
      const vb = sortField === 'data' ? `${b.data}${b.hora}` : b.maquina;
      return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb);
    });

    return list;
  }, [periodo, dataInicio, dataFim, busca, turnoFiltro, statusFiltro, somenteDiverg, sortField, sortDesc]);

  const totalPages = Math.ceil(registrosFiltrados.length / PER_PAGE);
  const paginado   = registrosFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalDiv   = registrosFiltrados.filter(r => r.divergente).length;
  const maqCob     = new Set(registrosFiltrados.map(r => r.maquina)).size;
  const turnosCob  = new Set(registrosFiltrados.map(r => `${r.data}-${r.turno}`)).size;

  function toggleSort(f: 'data' | 'maquina') {
    if (sortField === f) setSortDesc(!sortDesc);
    else { setSortField(f); setSortDesc(true); }
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Registros no período', value: registrosFiltrados.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'Turnos capturados',    value: turnosCob,                  color: 'bg-purple-50 text-purple-600' },
          { label: 'Máquinas cobertas',    value: maqCob,                     color: 'bg-green-50 text-green-600' },
          { label: 'Com divergência',      value: totalDiv,                   color: totalDiv > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500' },
        ].map(k => (
          <div key={k.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
              <span className="text-lg font-black leading-none">{k.value}</span>
            </div>
            <p className="text-xs font-semibold text-gray-600 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Período */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
            {periodoChips.map(c => (
              <button key={c.key} onClick={() => { setPeriodo(c.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodo === c.key ? 'bg-white text-operis-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >{c.label}</button>
            ))}
          </div>

          {periodo === 'personalizado' && (
            <>
              <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1); }} className="input w-auto text-xs" />
              <span className="text-gray-400 text-sm">até</span>
              <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1); }} className="input w-auto text-xs" />
            </>
          )}

          {/* Busca */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Máquina ou produto..." value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              className="input pl-8 w-52 text-xs" />
          </div>

          {/* Selects */}
          <select value={turnoFiltro} onChange={e => { setTurnoFiltro(e.target.value); setPage(1); }} className="input text-xs w-36">
            <option value="">Todos os turnos</option>
            <option value="PRIMEIRO">1º Turno</option>
            <option value="SEGUNDO">2º Turno</option>
            <option value="TERCEIRO">3º Turno</option>
          </select>

          <select value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1); }} className="input text-xs w-44">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Toggle divergência */}
          <button
            onClick={() => { setSomenteDiverg(!somenteDiverg); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              somenteDiverg
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle size={13} />
            {somenteDiverg ? 'Com divergência' : 'Todas'}
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[1fr_0.7fr_0.8fr_1.4fr_1fr_0.8fr_1fr_1.1fr] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
          <button className="flex items-center gap-1 text-left hover:text-gray-600" onClick={() => toggleSort('data')}>
            Data / Hora <ArrowUpDown size={10} />
          </button>
          <span>Turno</span>
          <button className="flex items-center gap-1 text-left hover:text-gray-600" onClick={() => toggleSort('maquina')}>
            Máquina <ArrowUpDown size={10} />
          </button>
          <span>Produto</span>
          <span>Ciclo atual / padrão</span>
          <span>Cavidade</span>
          <span>Status</span>
          <span>Validação</span>
        </div>

        {/* Linhas */}
        {paginado.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : paginado.map(r => {
          const sc  = STATUS_CFG[r.status] ?? { label: r.status, pill: 'bg-gray-100 text-gray-600' };
          const vciclo = validacaoCiclo(r.cicloAtual, r.ciclopadrao);
          const vcav   = validacaoCavidade(r.cavidadeAtual, r.cavidadepadrao);
          return (
            <div key={r.id}
              className={`grid grid-cols-[1fr_0.7fr_0.8fr_1.4fr_1fr_0.8fr_1fr_1.1fr] gap-3 px-5 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50 transition-colors text-sm ${r.divergente ? 'border-l-2 border-l-red-300' : ''}`}
            >
              <div>
                <p className="font-semibold text-operis-dark text-xs leading-none">{formatData(r.data)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{r.hora}</p>
              </div>
              <span className="text-xs text-gray-600">{TURNO_LABEL[r.turno]}</span>
              <span className="text-xs font-bold text-operis-dark">{r.maquina}</span>
              <span className="text-xs text-gray-700 leading-tight">{r.produto}</span>
              <CicloCell atual={r.cicloAtual} padrao={r.ciclopadrao} />
              <CavidadeCell atual={r.cavidadeAtual} padrao={r.cavidadepadrao} />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${sc.pill}`}>
                {sc.label}
              </span>
              <ValidacaoBadge ciclo={vciclo} cavidade={vcav} />
            </div>
          );
        })}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, registrosFiltrados.length)} de {registrosFiltrados.length}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${page === p ? 'bg-operis-dark text-white border-operis-dark' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Resumo Diário ────────────────────────
function TabResumoDiario() {
  const dias = useMemo(() => {
    const map = new Map<string, { data: string; turnos: Set<Turno>; total: number; prod: number; div: number; alertas: number }>();
    MOCK_REGISTROS.forEach(r => {
      if (!map.has(r.data)) map.set(r.data, { data: r.data, turnos: new Set(), total: 0, prod: 0, div: 0, alertas: 0 });
      const d = map.get(r.data)!;
      d.turnos.add(r.turno);
      d.total++;
      if (r.status === 'EM_PRODUCAO') d.prod++;
      if (r.divergente) { d.div++; d.alertas++; }
    });
    return Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-5 pb-2 text-[10px] text-gray-400 uppercase tracking-wider">
        <span>Data</span>
        <span>Turnos registrados</span>
        <span className="text-center">Registros</span>
        <span className="text-center text-green-600">Em produção</span>
        <span className="text-center text-red-500">Divergências</span>
        <span className="text-center">Produtividade</span>
      </div>
      {dias.map(d => {
        const pct = d.total > 0 ? Math.round((d.prod / d.total) * 100) : 0;
        return (
          <div key={d.data} className="card">
            <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-5 py-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-operis-dark leading-none">{formatData(d.data)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{d.total} registros</p>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {Array.from(d.turnos).map(t => (
                  <span key={t} className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {TURNO_LABEL[t]}
                  </span>
                ))}
              </div>
              <span className="text-center text-sm font-bold text-gray-700">{d.total}</span>
              <span className="text-center text-sm font-bold text-green-600">{d.prod}</span>
              <span className={`text-center text-sm font-bold ${d.div > 0 ? 'text-red-500' : 'text-gray-400'}`}>{d.div}</span>
              <div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <p className={`text-[10px] font-bold mt-0.5 ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {pct}%
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Banco de Produtos ────────────────────
interface ProdutoLocal extends Produto { editando?: boolean }

function TabProdutos() {
  const [busca, setBusca]         = useState('');
  const [produtos, setProdutos]   = useState<ProdutoLocal[]>(MOCK_PRODUTOS);
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ descricao: '', ciclopadrao: '', cavidadepadrao: '' });
  const [erro, setErro]           = useState('');

  const lista = useMemo(() => {
    if (!busca.trim()) return produtos;
    const q = busca.toLowerCase();
    return produtos.filter(p => p.descricao.toLowerCase().includes(q));
  }, [busca, produtos]);

  function abrirNovo() {
    setEditId(null);
    setForm({ descricao: '', ciclopadrao: '', cavidadepadrao: '' });
    setErro('');
    setFormAberto(true);
  }

  function abrirEditar(p: ProdutoLocal) {
    setEditId(p.id);
    setForm({ descricao: p.descricao, ciclopadrao: String(p.ciclopadrao), cavidadepadrao: String(p.cavidadepadrao) });
    setErro('');
    setFormAberto(true);
  }

  function salvar() {
    if (!form.descricao.trim())     { setErro('Descrição obrigatória.'); return; }
    if (!form.ciclopadrao)          { setErro('Ciclo padrão obrigatório.'); return; }
    if (!form.cavidadepadrao)       { setErro('Cavidade padrão obrigatória.'); return; }
    if (editId) {
      setProdutos(prev => prev.map(p => p.id === editId
        ? { ...p, descricao: form.descricao.trim(), ciclopadrao: Number(form.ciclopadrao), cavidadepadrao: Number(form.cavidadepadrao) }
        : p));
    } else {
      const novo: ProdutoLocal = {
        id: `p${Date.now()}`,
        descricao: form.descricao.trim(),
        ciclopadrao: Number(form.ciclopadrao),
        cavidadepadrao: Number(form.cavidadepadrao),
        ativo: true,
      };
      setProdutos(prev => [novo, ...prev]);
    }
    setFormAberto(false);
    setErro('');
  }

  function excluir(id: string) {
    if (confirm('Excluir este produto?')) {
      setProdutos(prev => prev.filter(p => p.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      {/* Modal de novo/editar produto */}
      {formAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-operis-dark">
                {editId ? 'Editar produto' : 'Novo produto'}
              </h2>
              <button onClick={() => setFormAberto(false)} className="text-gray-400 hover:text-gray-600">
                <Trash2 size={16} className="rotate-0" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Frasco reto 12"
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="input text-sm w-full"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Ciclo padrão (seg)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ex: 50"
                    value={form.ciclopadrao}
                    onChange={e => setForm(f => ({ ...f, ciclopadrao: e.target.value }))}
                    className="input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cavidade padrão</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ex: 24"
                    value={form.cavidadepadrao}
                    onChange={e => setForm(f => ({ ...f, cavidadepadrao: e.target.value }))}
                    className="input text-sm w-full"
                  />
                </div>
              </div>
              {erro && <p className="text-xs text-red-500 font-semibold">{erro}</p>}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setFormAberto(false)} className="btn-ghost text-sm">Cancelar</button>
              <button onClick={salvar} className="btn-primary text-sm gap-1.5">
                <CheckCircle2 size={14} /> {editId ? 'Salvar alterações' : 'Cadastrar produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de busca + botão */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar produto..." value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input pl-8 w-64 text-xs" />
        </div>
        <button onClick={abrirNovo} className="btn-primary text-sm gap-2">
          <Plus size={14} /> Novo Produto
        </button>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2fr_0.9fr_0.9fr_0.8fr] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
          <span>Descrição</span>
          <span className="text-center">Ciclo padrão</span>
          <span className="text-center">Cav. padrão</span>
          <span className="text-right">Ações</span>
        </div>

        {lista.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Package size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        ) : lista.map(p => (
          <div key={p.id}
            className="grid grid-cols-[2fr_0.9fr_0.9fr_0.8fr] gap-3 px-5 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50 transition-colors">
            <span className="text-sm font-semibold text-operis-dark">{p.descricao}</span>
            <span className="text-center text-sm text-gray-700 font-medium">{p.ciclopadrao}s</span>
            <span className="text-center text-sm text-gray-700 font-medium">{p.cavidadepadrao}</span>
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => abrirEditar(p)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                <Edit2 size={13} />
              </button>
              <button onClick={() => excluir(p.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-right">{lista.length} produto{lista.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ── Constantes do Apontar ─────────────────────
const MACHINES = Array.from({ length: 30 }, (_, i) => `MÁQ ${String(i + 1).padStart(2, '0')}`);

interface Apontamento {
  produto: string;
  cicloReal: string;
  cavidadeReal: string;
  status: string;
  observacao: string;
  op: string;
  qtdOP: string;
  qtdAcumulada: string;
}

const APONTAMENTO_VAZIO: Apontamento = {
  produto: '', cicloReal: '', cavidadeReal: '', status: '', observacao: '',
  op: '', qtdOP: '', qtdAcumulada: '',
};

function getValidacao(ap: Apontamento | undefined) {
  if (!ap) return null;
  const prod = MOCK_PRODUTOS.find(p => p.descricao === ap.produto);
  if (!prod || !ap.cicloReal || !ap.cavidadeReal || !ap.status) return null;

  const ciclo = Number(ap.cicloReal);
  const cav   = Number(ap.cavidadeReal);
  const deltaCiclo = prod.ciclopadrao > 0 ? Math.round(((ciclo - prod.ciclopadrao) / prod.ciclopadrao) * 100) : 0;
  const cicloOk    = Math.abs(deltaCiclo) <= 5;
  const cavOk      = cav >= prod.cavidadepadrao;

  return { prod, ciclo, cav, deltaCiclo, cicloOk, cavOk, ok: cicloOk && cavOk };
}

function isPreenchido(ap: Apontamento | undefined) {
  if (!ap) return false;
  return ap.produto !== '' && ap.cicloReal !== '' && ap.cavidadeReal !== '' && ap.status !== '';
}

// ── Tab Apontar ───────────────────────────────
type FiltroMaq = 'todas' | 'pendentes' | 'divergentes' | 'ok';

function TabApontar() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData]         = useState(hoje);
  const [turno, setTurno]       = useState<Turno>('PRIMEIRO');
  const [apts, setApts]         = useState<Record<string, Apontamento>>({});
  const [finalizado, setFinalizado]   = useState(false);
  const [salvando, setSalvando]       = useState(false);
  const [obsAberta, setObsAberta]     = useState<string | null>(null);
  const [buscaMaq, setBuscaMaq]       = useState('');
  const [filtroMaq, setFiltroMaq]     = useState<FiltroMaq>('todas');

  // Carrega snapshots reais do turno selecionado
  const { data: snapshotsRaw, isLoading: loadingSnaps } = useSnapshotsHoje(turno);
  const { data: produtosRaw } = useProdutos();
  const snapshots = (snapshotsRaw as any[]) ?? [];
  const produtosReais = (produtosRaw as any[]) ?? MOCK_PRODUTOS;

  // Pre-popula o formulário com os dados do snapshot
  useEffect(() => {
    if (!snapshots.length) return;
    const novoApts: Record<string, Apontamento> = {};
    for (const s of snapshots) {
      novoApts[s.maquina] = {
        produto:      s.produtoNome || s.produto?.descricao || '',
        op:           '',
        qtdOP:        '',
        qtdAcumulada: s.qtdAtual != null ? String(s.qtdAtual) : '',
        cicloReal:    s.cicloAtual != null ? String(s.cicloAtual) : '',
        cavidadeReal: s.cavidadeReal != null ? String(s.cavidadeReal) : '',
        status:       s.status || '',
        observacao:   s.observacao || '',
      };
    }
    setApts(novoApts);
  }, [snapshotsRaw, turno]);

  const maquinas = useMemo(() => snapshots.map((s: any) => s.maquina).sort((a: string, b: string) =>
    Number(a) - Number(b)
  ), [snapshots]);

  function setField(maq: string, field: keyof Apontamento, value: string) {
    setApts(prev => ({ ...prev, [maq]: { ...prev[maq], [field]: value } }));
  }

  const preenchidos  = maquinas.filter(m => isPreenchido(apts[m])).length;
  const divergentes  = maquinas.filter(m => { const v = getValidacao(apts[m]); return v && !v.ok; }).length;
  const dentropadrao = maquinas.filter(m => { const v = getValidacao(apts[m]); return v && v.ok; }).length;
  const progPct      = maquinas.length > 0 ? Math.round((preenchidos / maquinas.length) * 100) : 0;

  const maquinasFiltradas = useMemo(() => {
    let list = maquinas;
    if (buscaMaq.trim()) {
      const q = buscaMaq.toLowerCase();
      list = list.filter((m: string) => m.toLowerCase().includes(q));
    }
    if (filtroMaq === 'pendentes')   list = list.filter((m: string) => !isPreenchido(apts[m]));
    if (filtroMaq === 'divergentes') list = list.filter((m: string) => { const v = getValidacao(apts[m]); return v && !v.ok; });
    if (filtroMaq === 'ok')          list = list.filter((m: string) => { const v = getValidacao(apts[m]); return v && v.ok; });
    return list;
  }, [buscaMaq, filtroMaq, apts, maquinas]);

  async function salvarRonda() {
    setSalvando(true);
    try {
      await Promise.allSettled(
        maquinas.map((maq: string) => {
          const ap = apts[maq];
          if (!ap) return Promise.resolve();
          return api.patch(`/snapshots/maquina/${maq}`, {
            status:      ap.status || undefined,
            qtdAtual:    ap.qtdAcumulada ? Number(ap.qtdAcumulada) : undefined,
            observacao:  ap.observacao || undefined,
          });
        })
      );
      setFinalizado(true);
    } catch { /* silent */ }
    finally { setSalvando(false); }
  }

  function limparTudo() {
    setApts({});
    setFinalizado(false);
  }

  if (finalizado) {
    return (
      <div className="card p-12 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-operis-dark">Ronda finalizada!</h3>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })} — {TURNO_LABEL[turno]}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-operis-dark">{preenchidos}</p>
            <p className="text-xs text-gray-500">Registradas</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-600">{dentropadrao}</p>
            <p className="text-xs text-gray-500">Dentro padrão</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-red-600">{divergentes}</p>
            <p className="text-xs text-gray-500">Divergências</p>
          </div>
        </div>
        <button onClick={limparTudo} className="btn-ghost text-sm gap-2 mx-auto">
          <RotateCcw size={14} /> Nova ronda
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da ronda */}
      <div className="card p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Linha 1: data, turno, progresso, ações */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-3 flex-wrap w-full sm:w-auto">
            <div className="flex flex-col gap-1 flex-1 sm:flex-none">
              <label className="text-xs font-semibold text-gray-500">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="input text-sm w-full sm:w-40" />
            </div>
            <div className="flex flex-col gap-1 flex-1 sm:flex-none">
              <label className="text-xs font-semibold text-gray-500">Turno</label>
              <select value={turno} onChange={e => setTurno(e.target.value as Turno)} className="input text-sm w-full sm:w-52">
                <option value="PRIMEIRO">1º Turno — 06:00 às 14:00</option>
                <option value="SEGUNDO">2º Turno — 14:00 às 22:00</option>
                <option value="TERCEIRO">3º Turno — 22:00 às 06:00</option>
              </select>
            </div>
          </div>

          {/* Progresso */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs sm:text-sm font-semibold text-gray-700">{preenchidos} / {maquinas.length} máquinas</span>
              <span className="text-sm font-bold text-operis-dark">{progPct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progPct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progPct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1.5 text-xs">
              <span className="text-green-600 font-semibold">{dentropadrao} dentro do padrão</span>
              {divergentes > 0 && <span className="text-red-500 font-semibold">{divergentes} com divergência</span>}
              <span className="text-gray-400">{MACHINES.length - preenchidos} pendentes</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={limparTudo} className="btn-ghost text-xs sm:text-sm gap-1.5 flex-1 sm:flex-none justify-center">
              <RotateCcw size={14} /> Limpar
            </button>
            <button
              onClick={salvarRonda}
              disabled={preenchidos === 0 || salvando}
              className="btn-primary text-xs sm:text-sm gap-1.5 disabled:opacity-50 flex-1 sm:flex-none justify-center"
            >
              <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Ronda'}
            </button>
          </div>
        </div>

        {/* Linha 2: filtro de máquina */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 border-t border-gray-100">
          <div className="relative w-full sm:w-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar máquina..."
              value={buscaMaq}
              onChange={e => setBuscaMaq(e.target.value)}
              className="input pl-8 w-full sm:w-44 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {([
              { key: 'todas',       label: 'Todas',          count: maquinas.length },
              { key: 'pendentes',   label: 'Pendentes',      count: maquinas.length - preenchidos },
              { key: 'ok',          label: 'Dentro do padrão', count: dentropadrao },
              { key: 'divergentes', label: 'Com divergência', count: divergentes },
            ] as { key: FiltroMaq; label: string; count: number }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroMaq(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroMaq === f.key
                    ? f.key === 'divergentes' ? 'bg-red-600 text-white'
                    : f.key === 'ok' ? 'bg-green-600 text-white'
                    : 'bg-operis-dark text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filtroMaq === f.key ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          {(buscaMaq || filtroMaq !== 'todas') && (
            <span className="text-xs text-gray-400">
              Exibindo {maquinasFiltradas.length} de {maquinas.length} máquinas
            </span>
          )}
        </div>
      </div>

      {/* Grid de RondaCards */}
      {loadingSnaps ? (
        <div className='py-12 text-center text-gray-400 text-sm'>Carregando dados do turno...</div>
      ) : snapshots.length === 0 ? (
        <div className='card py-12 text-center text-gray-400 text-sm'>Nenhum dado sincronizado para este turno.</div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3'>
          {maquinasFiltradas.map((maq: string) => {
            const snap = snapshots.find((s: any) => s.maquina === maq);
            if (!snap) return null;
            return (
              <RondaCard
                key={maq}
                snapshot={snap}
                produtos={produtosReais}
                onApontado={() => {}}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Página principal

// ── Página principal ──────────────────────────
type Tab = 'apontar' | 'registros' | 'resumo' | 'produtos';

export default function RondaPage() {
  const [tab, setTab] = useState<Tab>('apontar');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'apontar',   label: 'Apontar Ronda',    icon: <ClipboardCheck size={15} /> },
    { key: 'registros', label: 'Registros',         icon: <LayoutList     size={15} /> },
    { key: 'resumo',    label: 'Resumo diário',     icon: <Calendar       size={15} /> },
    { key: 'produtos',  label: 'Banco de Produtos', icon: <Package        size={15} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'border-operis-dark text-operis-dark'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'apontar'   && <TabApontar />}
      {tab === 'registros' && <TabRegistros />}
      {tab === 'resumo'    && <TabResumoDiario />}
      {tab === 'produtos'  && <TabProdutos />}
    </div>
  );
}
