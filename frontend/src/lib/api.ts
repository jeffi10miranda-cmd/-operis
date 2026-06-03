// OPERIS — Cliente de API (axios + SWR)

import axios from 'axios';
import useSWR, { SWRConfiguration } from 'swr';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const PREVIEW_STORAGE_KEY = 'operis_preview_mode';

function hasAuthToken() {
  return typeof window !== 'undefined' && Boolean(localStorage.getItem('operis_token'));
}

export function hasApiAccess() {
  return hasAuthToken() || isPreviewModeEnabled();
}

export function isPreviewModeEnabled() {
  return typeof window !== 'undefined' && localStorage.getItem(PREVIEW_STORAGE_KEY) === 'true';
}

export function enablePreviewMode() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREVIEW_STORAGE_KEY, 'true');
}

export function disablePreviewMode() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREVIEW_STORAGE_KEY);
}

// ── Instância Axios ────────────────────────────
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Injeta token JWT automaticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('operis_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login em caso de 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('operis_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Fetcher para SWR ───────────────────────────
const fetcher = (url: string) => api.get(url).then((r) => r.data);

// Suprimir erros de rede no console (evita o overlay "1 error" do Next.js em modo preview)
const SILENT: SWRConfiguration = { onError: () => {} };

// ── Hooks de dados ─────────────────────────────

export function useKPIs() {
  return useSWR(hasApiAccess() ? '/snapshots/kpis' : null, fetcher, { ...SILENT, refreshInterval: 30000 });
}

export function useSnapshotsHoje(turno?: string, data?: string) {
  const params = new URLSearchParams();
  if (turno) params.set('turno', turno);
  if (data) params.set('data', data);
  const qs = params.toString();
  const url = `/snapshots/hoje${qs ? `?${qs}` : ''}`;
  return useSWR(hasApiAccess() ? url : null, fetcher, {
    ...SILENT,
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
  });
}

export function useSnapshotsUltimo() {
  return useSWR(hasApiAccess() ? '/snapshots/ultimo' : null, fetcher, SILENT);
}

export function useAlertas(params?: { lido?: boolean; page?: number; severidade?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.lido !== undefined) query.set('lido', String(params.lido));
  if (params?.page) query.set('page', String(params.page));
  if (params?.severidade) query.set('severidade', params.severidade);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  const url = qs ? `/alertas?${qs}` : '/alertas';
  // No layout, só buscar alertas recentes se tiver token real (não apenas preview)
  return useSWR(hasAuthToken() ? url : null, fetcher, { ...SILENT, refreshInterval: 15000 });
}

export function useContagemAlertas() {
  // No layout: só buscar contagem com token real para evitar erros em modo preview
  return useSWR(hasAuthToken() ? '/alertas/contagem' : null, fetcher, { ...SILENT, refreshInterval: 10000 });
}

export function useRondas(params?: { page?: number; limit?: number; dataInicio?: string; dataFim?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.dataInicio) query.set('dataInicio', params.dataInicio);
  if (params?.dataFim) query.set('dataFim', params.dataFim);
  const qs = query.toString();
  return useSWR(hasApiAccess() ? `/rondas${qs ? `?${qs}` : ''}` : null, fetcher, SILENT);
}

export function useRondaHoje() {
  return useSWR(hasApiAccess() ? '/rondas/hoje' : null, fetcher, { ...SILENT, refreshInterval: 60000 });
}

export function useProdutos() {
  return useSWR(hasApiAccess() ? '/produtos' : null, fetcher, SILENT);
}

export function useHorasStatus(data: string) {
  return useSWR(
    hasApiAccess() ? `/snapshots/horas-status?data=${data}` : null,
    fetcher,
    { ...SILENT, refreshInterval: 60000 },
  );
}

export function useComparativoDias(dataA?: string, dataB?: string, somenteAlteracoes?: boolean) {
  const enabled = dataA && dataB;
  const url = enabled
    ? `/comparativos/dias?dataA=${dataA}&dataB=${dataB}${somenteAlteracoes ? '&somenteAlteracoes=true' : ''}`
    : null;
  return useSWR(hasApiAccess() ? url : null, fetcher, SILENT);
}

export function useComparativoTurnos(data?: string) {
  return useSWR(hasApiAccess() && data ? `/comparativos/turnos?data=${data}` : null, fetcher, SILENT);
}

export function useAuthUser() {
  return useSWR(hasAuthToken() ? '/auth/me' : null, fetcher, SILENT);
}

export async function fetchConfiguracao() {
  return api.get<Record<string, string>>('/configuracao').then((r) => r.data);
}

export async function saveConfiguracao(data: Record<string, string>) {
  return api.put('/configuracao', data).then((r) => r.data);
}

export async function fetchUsuarios() {
  return api.get('/configuracao/usuarios').then((r) => r.data);
}

export async function criarUsuario(data: { name: string; email: string; password: string; role: string }) {
  return api.post('/configuracao/usuarios', data).then((r) => r.data);
}

export async function testarConexaoPlanilha(sheetId: string) {
  return api.post<{ conectado: boolean; sheetId: string }>('/sheets/testar-conexao', { sheetId }).then((r) => r.data);
}

export interface OperisLogEntry {
  id: string;
  modulo: string;
  acao: string;
  descricao: string;
  severidade: 'INFO' | 'ATENCAO' | 'CRITICO';
  createdAt: string;
  usuario?: { id: string; name: string; email: string } | null;
}

export function useLogs(params?: {
  modulo?: string;
  severidade?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.modulo) query.set('modulo', params.modulo);
  if (params?.severidade) query.set('severidade', params.severidade);
  if (params?.dataInicio) query.set('dataInicio', params.dataInicio);
  if (params?.dataFim) query.set('dataFim', params.dataFim);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return useSWR(hasApiAccess() ? `/logs${qs ? `?${qs}` : ''}` : null, fetcher);
}

// ── Ações ──────────────────────────────────────

export async function sincronizarPlanilhas() {
  return api.post('/sheets/sincronizar').then(r => r.data);
}

export async function marcarAlertaLido(id: string) {
  return api.patch(`/alertas/${id}/lido`).then(r => r.data);
}

export async function marcarTodosAlertasLidos() {
  return api.patch('/alertas/marcar-todos-lidos').then(r => r.data);
}

export async function deletarAlerta(id: string) {
  return api.delete(`/alertas/${id}`).then(r => r.data);
}

export async function deletarTodosAlertasLidos() {
  return api.delete('/alertas/lidos').then(r => r.data);
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('operis_token', data.token);
  disablePreviewMode();
  return data;
}

export function logout() {
  localStorage.removeItem('operis_token');
  disablePreviewMode();
  window.location.href = '/login';
}
