import axios from 'axios';
import type {
  LoginResponse, User, KPIsData, Snapshot, Ronda,
  Alerta, AlertaContagem, ComparativoDia, ComparativoTurno,
  ResumoPeriodo, Produto, Configuracao, PaginatedResponse,
} from '@/types/operis';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';

export const http = axios.create({
  baseURL: BASE,
  timeout: 10000,
});

// Injeta token em toda requisição autenticada
http.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('operis_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('operis_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    http.post<LoginResponse>('/api/auth/login', { email, password }).then((r) => r.data),
  me: () => http.get<User>('/api/auth/me').then((r) => r.data),
};

// ─── Snapshots / KPIs ─────────────────────────────────────────────────────────
export const snapshots = {
  kpis: (turno?: string) =>
    http.get<KPIsData>('/api/snapshots/kpis', { params: turno ? { turno } : {} }).then((r) => r.data),
  hoje: (turno?: string) =>
    http.get<Snapshot[]>('/api/snapshots/hoje', { params: turno ? { turno } : {} }).then((r) => r.data),
  maquina: (id: string, dataInicio?: string, dataFim?: string) =>
    http.get<Snapshot[]>(`/api/snapshots/maquina/${id}`, { params: { dataInicio, dataFim } }).then((r) => r.data),
};

// ─── Rondas ───────────────────────────────────────────────────────────────────
export const rondas = {
  lista: (params?: { page?: number; limit?: number; dataInicio?: string; dataFim?: string }) =>
    http.get<PaginatedResponse<Ronda>>('/api/rondas', { params }).then((r) => r.data),
  hoje: () => http.get<Ronda | null>('/api/rondas/hoje').then((r) => r.data),
  porData: (data: string) => http.get<Ronda>(`/api/rondas/${data}`).then((r) => r.data),
};

// ─── Alertas ──────────────────────────────────────────────────────────────────
export const alertas = {
  lista: (params?: {
    lido?: boolean; maquina?: string; severidade?: string; tipo?: string; page?: number; limit?: number;
  }) => http.get<PaginatedResponse<Alerta>>('/api/alertas', { params }).then((r) => r.data),
  contagem: () => http.get<AlertaContagem>('/api/alertas/contagem').then((r) => r.data),
  marcarLido: (id: string) => http.patch(`/api/alertas/${id}/lido`).then((r) => r.data),
  marcarTodosLidos: () => http.patch('/api/alertas/marcar-todos-lidos').then((r) => r.data),
};

// ─── Comparativos ─────────────────────────────────────────────────────────────
export const comparativos = {
  dias: (dataA: string, dataB: string, maquina?: string) =>
    http.get<ComparativoDia[]>('/api/comparativos/dias', { params: { dataA, dataB, maquina } }).then((r) => r.data),
  turnos: (data: string) =>
    http.get<ComparativoTurno[]>('/api/comparativos/turnos', { params: { data } }).then((r) => r.data),
  periodo: (dataInicio: string, dataFim: string) =>
    http.get<ResumoPeriodo[]>('/api/comparativos/periodo', { params: { dataInicio, dataFim } }).then((r) => r.data),
};

// ─── Produtos ─────────────────────────────────────────────────────────────────
export const produtos = {
  lista: () => http.get<Produto[]>('/api/produtos').then((r) => r.data),
  buscar: (q: string) => http.get<Produto[]>('/api/produtos/buscar', { params: { q } }).then((r) => r.data),
  criar: (data: Omit<Produto, 'id' | 'ativo' | 'createdAt'>) =>
    http.post<Produto>('/api/produtos', data).then((r) => r.data),
  atualizar: (id: string, data: Partial<Produto>) =>
    http.put<Produto>(`/api/produtos/${id}`, data).then((r) => r.data),
  remover: (id: string) => http.delete(`/api/produtos/${id}`).then((r) => r.data),
};

// ─── Configurações ────────────────────────────────────────────────────────────
export const config = {
  listar: () => http.get<Configuracao>('/api/configuracao').then((r) => r.data),
  salvar: (data: Configuracao) => http.put('/api/configuracao', data).then((r) => r.data),
  listarUsuarios: () => http.get<User[]>('/api/configuracao/usuarios').then((r) => r.data),
  criarUsuario: (data: { name: string; email: string; password: string; role: string }) =>
    http.post<User>('/api/configuracao/usuarios', data).then((r) => r.data),
};

// ─── Google Sheets ────────────────────────────────────────────────────────────
export const sheets = {
  sincronizar: () => http.post<{ sucesso: boolean; detalhes: string }>('/api/sheets/sincronizar').then((r) => r.data),
  testarConexao: (sheetId: string) =>
    http.post<{ conectado: boolean; sheetId: string }>('/api/sheets/testar-conexao', { sheetId }).then((r) => r.data),
};
