'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  fetchConfiguracao,
  saveConfiguracao,
  testarConexaoPlanilha,
  fetchUsuarios,
  criarUsuario,
} from '@/lib/api';
import type { User } from '@/types/operis';
import {
  Sheet, Shield, Bell, Users, Sliders, CheckCircle,
  AlertCircle, Loader2, Eye, EyeOff, Plus,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle?: string; icon: ReactNode; children: ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-operis-dark/5 flex items-center justify-center flex-shrink-0 text-operis-dark">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-operis-dark">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`btn-primary text-sm gap-2 min-w-[110px] justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : saved ? (
        <><CheckCircle size={14} />Salvo!</>
      ) : (
        'Salvar alterações'
      )}
    </button>
  );
}

// extrai o ID de uma URL do Google Sheets ou retorna o valor limpo
function extractSheetId(input: string): string {
  const trimmed = input.trim();
  // tenta extrair da URL: .../spreadsheets/d/ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return trimmed;
}

type SheetPreview = { rows: number; headers: string[]; sample: string[][] };

async function fetchSheetDirect(sheetId: string): Promise<SheetPreview> {
  // gviz/tq tem suporte a CORS para planilhas públicas/compartilhadas
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();

  // Remove o wrapper JSONP: /*O_o*/ google.visualization.Query.setResponse({...});
  const jsonStr = text
    .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
    .replace(/^google\.visualization\.Query\.setResponse\(/, '')
    .replace(/\);\s*$/, '');

  const data = JSON.parse(jsonStr);

  if (data.status === 'error') {
    const msg = data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || '';
    throw new Error(msg || 'Erro na planilha');
  }

  const table   = data.table;
  const headers = (table.cols as { label: string }[]).map(c => c.label || '');
  const total   = (table.rows as unknown[])?.length || 0;
  const sample  = ((table.rows as { c: Array<{ v: unknown } | null> }[]) || [])
    .slice(0, 3)
    .map(row => row.c.map(cell => (cell?.v != null ? String(cell.v) : '')));

  return { rows: total, headers, sample };
}

// ─── Seção: Google Sheets ─────────────────────────────────────────────────────
function SheetsSection() {
  const [values, setValues] = useState({ sheet1: '', sheet2: '', sheet3: '', intervalo: '5' });
  const [rawInputs, setRawInputs]     = useState({ sheet1: '', sheet2: '', sheet3: '' });
  const [testing, setTesting]         = useState<string | null>(null);
  const [testResult, setTestResult]   = useState<Record<string, 'ok' | 'error' | null>>({});
  const [previews, setPreviews]       = useState<Record<string, SheetPreview | null>>({});
  const [testError, setTestError]     = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [saved, setSaved]             = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    fetchConfiguracao()
      .then((cfg) => {
        setValues({
          sheet1: cfg.sheet_id_turno_1 ?? '',
          sheet2: cfg.sheet_id_turno_2 ?? '',
          sheet3: cfg.sheet_id_turno_3 ?? '',
          intervalo: cfg.sync_interval_minutos ?? '5',
        });
      })
      .catch(() => setBackendOffline(true));
  }, []);

  const handleTest = async (key: string, id: string) => {
    if (!id.trim()) return;
    setTesting(key);
    setTestResult(p => ({ ...p, [key]: null }));
    setPreviews(p  => ({ ...p, [key]: null }));
    setTestError(p => ({ ...p, [key]: '' }));
    try {
      if (!backendOffline) {
        const r = await testarConexaoPlanilha(id);
        if (r.conectado) {
          setTestResult(p => ({ ...p, [key]: 'ok' }));
        } else {
          throw new Error('Servidor retornou não conectado');
        }
      } else {
        // leitura direta do Google Sheets (frontend)
        const preview = await fetchSheetDirect(id);
        setTestResult(p => ({ ...p, [key]: 'ok' }));
        setPreviews(p  => ({ ...p, [key]: preview }));
      }
    } catch (e: unknown) {
      setTestResult(p => ({ ...p, [key]: 'error' }));
      const msg = e instanceof Error ? e.message : '';
      setTestError(p => ({
        ...p,
        [key]: msg.includes('403') || msg.includes('401')
          ? 'Planilha privada — defina como "qualquer pessoa com o link pode ver"'
          : msg.includes('404')
          ? 'Planilha não encontrada — verifique o ID'
          : 'Não foi possível acessar. Verifique se a planilha é pública.',
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backendOffline) return;
    setLoading(true);
    try {
      await saveConfiguracao({
        sheet_id_turno_1: values.sheet1,
        sheet_id_turno_2: values.sheet2,
        sheet_id_turno_3: values.sheet3,
        sync_interval_minutos: values.intervalo,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Integração Google Sheets" subtitle="IDs das planilhas por turno" icon={<Sheet size={18} />}>
      <form onSubmit={handleSave} className="space-y-4">
        {([
          { key: 'sheet1', label: '1º Turno (06:00 – 14:00)' },
          { key: 'sheet2', label: '2º Turno (14:00 – 22:00)' },
          { key: 'sheet3', label: '3º Turno (22:00 – 06:00)' },
        ] as const).map(({ key, label }) => {
          const extractedId = values[key];
          const isUrl       = rawInputs[key].includes('spreadsheets');
          const preview     = previews[key];
          const err         = testError[key];
          return (
            <Field key={key} label={label} hint="Cole a URL completa ou somente o ID da planilha">
              <div className="space-y-2">
                {/* Input + botão */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rawInputs[key] || values[key]}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const id  = extractSheetId(raw);
                      setRawInputs(p => ({ ...p, [key]: raw }));
                      setValues(p   => ({ ...p, [key]: id  }));
                      setTestResult(p => ({ ...p, [key]: null }));
                      setPreviews(p   => ({ ...p, [key]: null }));
                      setTestError(p  => ({ ...p, [key]: ''   }));
                    }}
                    className="input text-xs font-mono"
                    placeholder="Cole a URL ou o ID da planilha..."
                  />
                  <button
                    type="button"
                    onClick={() => handleTest(key, extractedId)}
                    disabled={testing === key || !extractedId}
                    className={`btn-ghost text-xs flex-shrink-0 min-w-[90px] justify-center ${
                      testing === key || !extractedId ? 'opacity-50' : ''
                    }`}
                  >
                    {testing === key ? (
                      <><Loader2 size={12} className="animate-spin" /> Verificando</>
                    ) : testResult[key] === 'ok' ? (
                      <><CheckCircle size={12} className="text-green-500" /> Conectado</>
                    ) : testResult[key] === 'error' ? (
                      <><AlertCircle size={12} className="text-red-500" /> Erro</>
                    ) : (
                      'Verificar'
                    )}
                  </button>
                </div>

                {/* ID extraído */}
                {isUrl && extractedId && !preview && !err && (
                  <div className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                    <CheckCircle size={11} className="text-green-500 flex-shrink-0" />
                    <span>ID extraído:</span>
                    <code className="font-mono font-semibold truncate">{extractedId}</code>
                  </div>
                )}

                {/* Erro de acesso */}
                {err && (
                  <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                    <AlertCircle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                )}

                {/* Preview da planilha */}
                {preview && (
                  <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-green-200 bg-green-100">
                      <CheckCircle size={13} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-700">
                        Conectado — {preview.rows} linha{preview.rows !== 1 ? 's' : ''} encontrada{preview.rows !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="bg-green-100/60">
                            {preview.headers.slice(0, 8).map((h, i) => (
                              <th key={i} className="px-2 py-1 text-left font-bold text-green-800 whitespace-nowrap border-r border-green-200 last:border-0">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.sample.map((row, ri) => (
                            <tr key={ri} className="border-t border-green-100">
                              {row.slice(0, 8).map((cell, ci) => (
                                <td key={ci} className="px-2 py-1 text-green-900 whitespace-nowrap border-r border-green-100 last:border-0 max-w-[120px] truncate">
                                  {cell || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </Field>
          );
        })}

        <Field label="Intervalo de sincronização" hint="O sistema sincronizará a cada N minutos entre 06h e 23h59">
          <div className="flex items-center gap-3">
            <input
              type="number" min="1" max="60"
              value={values.intervalo}
              onChange={(e) => setValues(p => ({ ...p, intervalo: e.target.value }))}
              className="input w-24 text-sm"
            />
            <span className="text-sm text-gray-500">minutos</span>
          </div>
        </Field>

        <div className="flex justify-end pt-2">
          <SaveButton loading={loading} saved={saved} />
        </div>
      </form>
    </SectionCard>
  );
}

// ─── Seção: Limites operacionais ──────────────────────────────────────────────
function LimitesSection() {
  const [values, setValues] = useState({
    desvio: '10',
    setupMax: '60',
    cavMin: '1',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchConfiguracao()
      .then((cfg) => {
        setValues({
          desvio: cfg.alert_ciclo_desvio_pct ?? '10',
          setupMax: cfg.alert_setup_max_minutos ?? '60',
          cavMin: cfg.alert_cavidade_min_diff ?? '1',
        });
      })
      .catch(() => {}); // usa valores padrão quando offline
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await saveConfiguracao({
        alert_ciclo_desvio_pct: values.desvio,
        alert_setup_max_minutos: values.setupMax,
        alert_cavidade_min_diff: values.cavMin,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Erro ao salvar limites.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Limites Operacionais" subtitle="Parâmetros que definem alertas automáticos" icon={<Sliders size={18} />}>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Desvio de ciclo para alerta (%)" hint="Alertas serão gerados quando o ciclo real divergir deste percentual do ciclo padrão">
          <div className="flex items-center gap-3">
            <input type="number" min="1" max="100" value={values.desvio}
              onChange={(e) => setValues((p) => ({ ...p, desvio: e.target.value }))}
              className="input w-24 text-sm" />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </Field>

        <Field label="Tempo máximo de setup (min)" hint="Alertas de setup excessivo serão gerados após este tempo sem retorno à produção">
          <div className="flex items-center gap-3">
            <input type="number" min="1" value={values.setupMax}
              onChange={(e) => setValues((p) => ({ ...p, setupMax: e.target.value }))}
              className="input w-24 text-sm" />
            <span className="text-sm text-gray-500">minutos</span>
          </div>
        </Field>

        <Field label="Mínimo de cavidades abaixo para alerta" hint="Alerta de cavidade é gerado quando a cavidade real fica N unidades abaixo do padrão">
          <div className="flex items-center gap-3">
            <input type="number" min="1" value={values.cavMin}
              onChange={(e) => setValues((p) => ({ ...p, cavMin: e.target.value }))}
              className="input w-24 text-sm" />
            <span className="text-sm text-gray-500">cavidades</span>
          </div>
        </Field>

        <div className="flex justify-end pt-2">
          <SaveButton loading={loading} saved={saved} />
        </div>
      </form>
    </SectionCard>
  );
}

const roleLabel: Record<string, { label: string; badge: string }> = {
  ADMIN:       { label: 'Admin',       badge: 'bg-operis-dark text-white' },
  SUPERVISOR:  { label: 'Supervisor',  badge: 'bg-blue-100 text-blue-700' },
  OPERADOR:    { label: 'Operador',    badge: 'bg-green-100 text-green-700' },
  VISUALIZADOR:{ label: 'Visualizador',badge: 'bg-gray-100 text-gray-600' },
};

function UsuariosSection() {
  const [users, setUsers]     = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', password: '', role: 'OPERADOR' });
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetchUsuarios()
      .then((list) => setUsers(list as User[]))
      .catch(() => {}); // requer ADMIN e backend conectado
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await criarUsuario(form) as User;
      setUsers((p) => [...p, { ...created, active: true, createdAt: new Date().toISOString() }]);
      setForm({ name: '', email: '', password: '', role: 'OPERADOR' });
      setShowForm(false);
    } catch {
      setError('Erro ao criar usuário. Verifique permissões e dados.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Usuários do Sistema" subtitle="Gerenciamento de acesso e permissões" icon={<Users size={18} />}>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="space-y-2">
        {users.map((u) => {
          const rc = roleLabel[u.role] ?? roleLabel.VISUALIZADOR;
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-operis-dark/10 flex items-center justify-center text-operis-dark font-bold text-sm flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-operis-dark">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rc.badge}`}>{rc.label}</span>
                <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-300'}`} title={u.active ? 'Ativo' : 'Inativo'} />
              </div>
            </div>
          );
        })}
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-operis-dark">Novo usuário</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nome completo" required value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="input text-sm col-span-2" />
            <input placeholder="E-mail" type="email" required value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="input text-sm" />
            <div className="relative">
              <input placeholder="Senha" type={showPwd ? 'text' : 'password'} required minLength={6} value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="input text-sm pr-10 w-full" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="input text-sm col-span-2">
              <option value="VISUALIZADOR">Visualizador</option>
              <option value="OPERADOR">Operador</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-xs">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
              {saving ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:text-operis-dark hover:border-operis-dark transition-colors font-medium">
          <Plus size={16} />
          Adicionar usuário
        </button>
      )}
    </SectionCard>
  );
}

// ─── Seção: Permissões ────────────────────────────────────────────────────────
const permissoes = [
  { acao: 'Visualizar Central',      ADMIN: true, SUPERVISOR: true, OPERADOR: true,  VISUALIZADOR: true },
  { acao: 'Visualizar Ronda',        ADMIN: true, SUPERVISOR: true, OPERADOR: true,  VISUALIZADOR: true },
  { acao: 'Visualizar Comparativos', ADMIN: true, SUPERVISOR: true, OPERADOR: true,  VISUALIZADOR: true },
  { acao: 'Visualizar Alertas',      ADMIN: true, SUPERVISOR: true, OPERADOR: true,  VISUALIZADOR: true },
  { acao: 'Marcar Alertas como lido',ADMIN: true, SUPERVISOR: true, OPERADOR: true,  VISUALIZADOR: false },
  { acao: 'Acessar Configurações',   ADMIN: true, SUPERVISOR: true, OPERADOR: false, VISUALIZADOR: false },
  { acao: 'Gerenciar usuários',      ADMIN: true, SUPERVISOR: false,OPERADOR: false, VISUALIZADOR: false },
  { acao: 'Sincronizar planilhas',   ADMIN: true, SUPERVISOR: true, OPERADOR: false, VISUALIZADOR: false },
];

function PermissoesSection() {
  return (
    <SectionCard title="Permissões por Papel" subtitle="Visão geral de acesso por role" icon={<Shield size={18} />}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Ação</th>
              {['ADMIN','SUPERVISOR','OPERADOR','VISUALIZADOR'].map((r) => (
                <th key={r} className="text-center pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissoes.map((p) => (
              <tr key={p.acao} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 text-gray-700 text-sm">{p.acao}</td>
                {(['ADMIN','SUPERVISOR','OPERADOR','VISUALIZADOR'] as const).map((r) => (
                  <td key={r} className="py-2.5 text-center">
                    {p[r] ? (
                      <CheckCircle size={16} className="inline text-green-500" />
                    ) : (
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-200" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Seção: Regras de Alerta ──────────────────────────────────────────────────
const alertRules = [
  { tipo: 'Ciclo acima do padrão',    ativo: true,  descricao: 'Gera alerta quando o ciclo real supera o padrão + desvio configurado' },
  { tipo: 'Ciclo abaixo do padrão',   ativo: true,  descricao: 'Gera alerta informativo quando o ciclo real está muito abaixo do padrão' },
  { tipo: 'Cavidade abaixo do padrão',ativo: true,  descricao: 'Gera alerta quando a cavidade real fica abaixo da cavidade padrão do produto' },
  { tipo: 'Máquina parada',           ativo: true,  descricao: 'Gera alerta crítico quando máquina entra em manutenção ou ferramentaria' },
  { tipo: 'Troca de produto',         ativo: true,  descricao: 'Gera alerta informativo quando o produto da máquina muda entre turnos' },
  { tipo: 'Setup excessivo',          ativo: false, descricao: 'Alerta quando o tempo de setup supera o limite configurado' },
  { tipo: 'Recorrência operacional',  ativo: false, descricao: 'Alerta quando o mesmo problema ocorre em turnos consecutivos' },
];

function AlertRulesSection() {
  const [rules, setRules] = useState(alertRules);

  return (
    <SectionCard title="Regras de Alerta" subtitle="Configure quais eventos geram alertas" icon={<Bell size={18} />}>
      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div key={rule.tipo} className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{rule.tipo}</p>
              <p className="text-xs text-gray-400 mt-0.5">{rule.descricao}</p>
            </div>
            <button
              onClick={() => setRules((p) => p.map((r, j) => j === i ? { ...r, ativo: !r.ativo } : r))}
              className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${rule.ativo ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${rule.ativo ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <SheetsSection />
      <LimitesSection />
      <UsuariosSection />
      <AlertRulesSection />
    </div>
  );
}
