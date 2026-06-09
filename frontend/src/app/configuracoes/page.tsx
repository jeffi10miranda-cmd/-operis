'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/lib/api';
import {
  fetchConfiguracao,
  saveConfiguracao,
  testarConexaoPlanilha,
  fetchUsuarios,
  criarUsuario,
  atualizarRoleUsuario,
  excluirUsuario,
  fetchProdutos,
  criarProduto,
  atualizarProduto,
  removerProduto,
} from '@/lib/api';
import type { User, Produto } from '@/types/operis';
import {
  Sheet, Shield, Bell, Users, Sliders, CheckCircle,
  AlertCircle, Loader2, Eye, EyeOff, Plus, Settings2, Palette,
  Trash2, ChevronUp, ChevronDown, Package, Pencil, X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, icon, action, children }: {
  title: string; subtitle?: string; icon: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-operis-dark/5 flex items-center justify-center flex-shrink-0 text-operis-dark">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-operis-dark">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
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
const CAVIDADES_PADRAO = [4, 8, 16, 24, 32, 48, 64, 128];

// Padrão: alerta quando fechar metade das cavidades
const CAVIDADES_DEFAULT: Record<number, number> = {
  4: 2, 8: 2, 16: 4, 24: 4, 32: 8, 48: 8, 64: 16, 128: 32,
};

function LimitesSection() {
  const [values, setValues] = useState({ desvio: '10', setupMax: '60' });
  // cavConfig: { 4: 2, 8: 2, ... } → molde de N cav alerta se fechar X
  const [cavConfig, setCavConfig] = useState<Record<number, number>>(CAVIDADES_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchConfiguracao()
      .then((cfg) => {
        setValues({ desvio: cfg.alert_ciclo_desvio_pct ?? '10', setupMax: cfg.alert_setup_max_minutos ?? '60' });
        if (cfg.alert_cavidades_config) {
          try { setCavConfig(JSON.parse(cfg.alert_cavidades_config)); } catch { /* usa padrão */ }
        }
      })
      .catch(() => {});
  }, []);

  const doSave = async () => {
    setLoading(true);
    setError('');
    try {
      await saveConfiguracao({
        alert_ciclo_desvio_pct:  values.desvio,
        alert_setup_max_minutos: values.setupMax,
        alert_cavidades_config:  JSON.stringify(cavConfig),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Erro ao salvar limites.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => { e.preventDefault(); await doSave(); };

  const configBtn = (
    <button
      type="button"
      onClick={doSave}
      disabled={loading}
      title="Salvar configurações"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-operis-dark text-white hover:bg-operis-dark/90 disabled:opacity-50 transition-all"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Settings2 size={13} />}
      Configurar
    </button>
  );

  return (
    <SectionCard title="Limites Operacionais" subtitle="Parâmetros que definem alertas automáticos" icon={<Sliders size={18} />} action={configBtn}>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Desvio de ciclo para alerta (%)" hint="Alerta gerado quando o ciclo real divergir (para cima ou para baixo) deste percentual em relação ao ciclo padrão do produto cadastrado">
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

        <Field label="Cavidades fechadas para alarmar" hint="Para cada tamanho de molde, defina quantas cavidades fechadas disparam o alerta crítico.">
          <div className="mt-2 space-y-2">
            {/* cabeçalho */}
            <div className="grid grid-cols-[80px_1fr_auto] gap-3 px-3 text-[10px] text-gray-400 uppercase tracking-wider">
              <span>Molde</span>
              <span>Fechadas para alarmar</span>
              <span>Restam</span>
            </div>
            {CAVIDADES_PADRAO.map((total) => {
              const fechadas = cavConfig[total] ?? 1;
              const restam   = total - fechadas;
              return (
                <div key={total} className="grid grid-cols-[80px_1fr_auto] gap-3 items-center bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-bold text-operis-dark">{total} cav</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={total - 1}
                      value={fechadas}
                      onChange={(e) => {
                        const v = Math.min(total - 1, Math.max(1, parseInt(e.target.value) || 1));
                        setCavConfig((p) => ({ ...p, [total]: v }));
                      }}
                      className="input w-16 text-sm text-center"
                    />
                    <span className="text-xs text-gray-500">fechadas → alarma</span>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${restam <= total / 2 ? 'text-red-500' : 'text-gray-500'}`}>
                    {restam} abertas
                  </span>
                </div>
              );
            })}
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

const ROLES_ORDEM = ['VISUALIZADOR', 'OPERADOR', 'SUPERVISOR', 'ADMIN'] as const;

function UsuariosSection({ currentRole }: { currentRole: string }) {
  const [users, setUsers]     = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', password: '', role: 'OPERADOR' });
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsuarios()
      .then((list) => setUsers(list as User[]))
      .catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const created = await criarUsuario(form) as User;
      setUsers((p) => [...p, { ...created, active: true, createdAt: new Date().toISOString() }]);
      setForm({ name: '', email: '', password: '', role: 'OPERADOR' });
      setShowForm(false);
    } catch { setError('Erro ao criar usuário. Verifique permissões e dados.'); }
    finally  { setSaving(false); }
  };

  async function mudarRole(id: string, role: string | undefined) {
    if (!role) return;
    setActionId(id); setError('');
    try {
      const updated = await atualizarRoleUsuario(id, role) as User;
      setUsers(p => p.map(u => u.id === id ? { ...u, role: updated.role } : u));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error
        ?? (e as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.message
        ?? 'Erro ao alterar perfil.';
      setError(msg);
    } finally { setActionId(null); }
  }

  async function deletar(id: string, nome: string) {
    if (!confirm(`Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setActionId(id); setError('');
    try {
      await excluirUsuario(id);
      setUsers(p => p.filter(u => u.id !== id));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error
        ?? (e as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.message
        ?? 'Erro ao excluir usuário.';
      setError(msg);
    } finally { setActionId(null); }
  }

  return (
    <SectionCard title="Usuários do Sistema" subtitle="Gerenciamento de acesso e permissões" icon={<Users size={18} />}>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="space-y-2">
        {users.map((u) => {
          const rc  = roleLabel[u.role] ?? roleLabel.VISUALIZADOR;
          const idx = ROLES_ORDEM.indexOf(u.role as typeof ROLES_ORDEM[number]);
          const idxValido  = idx >= 0;
          const ehAdmin    = u.role === 'ADMIN';
          // Supervisor não pode promover para ADMIN nem mexer em ADMINs
          const bloqueadoParaSupervisor = currentRole === 'SUPERVISOR' && ehAdmin;
          // Ninguém pode mexer em si mesmo
          const podeSobir  = idxValido && idx < ROLES_ORDEM.length - 1 && !bloqueadoParaSupervisor
                            && !(currentRole === 'SUPERVISOR' && ROLES_ORDEM[idx + 1] === 'ADMIN');
          const podeDescer = idxValido && idx > 0 && !bloqueadoParaSupervisor;
          const podeExcluir = !bloqueadoParaSupervisor;
          const busy = actionId === u.id;
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-operis-dark/10 flex items-center justify-center text-operis-dark font-bold text-sm flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-operis-dark truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Badge de perfil */}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rc.badge}`}>{rc.label}</span>

                {/* Promover */}
                <button
                  onClick={() => mudarRole(u.id, ROLES_ORDEM[idx + 1])}
                  disabled={!podeSobir || busy}
                  title={`Promover para ${ROLES_ORDEM[idx + 1] ?? ''}`}
                  className="p-1 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-30 transition-colors"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <ChevronUp size={13} />}
                </button>

                {/* Despromover */}
                <button
                  onClick={() => mudarRole(u.id, ROLES_ORDEM[idx - 1])}
                  disabled={!podeDescer || busy}
                  title={`Despromover para ${ROLES_ORDEM[idx - 1] ?? ''}`}
                  className="p-1 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown size={13} />
                </button>

                {/* Excluir */}
                <button
                  onClick={() => deletar(u.id, u.name)}
                  disabled={busy || !podeExcluir}
                  title={podeExcluir ? 'Excluir usuário' : 'Sem permissão'}
                  className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors ml-1"
                >
                  <Trash2 size={13} />
                </button>
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
              <option value="ADMIN">Administrador</option>
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
          <Plus size={16} /> Adicionar usuário
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

// ─── Seção: Produtos ──────────────────────────────────────────────────────────
const PRODUTO_VAZIO = { codigo: '', descricao: '', ciclopadrao: '', cavidadepadrao: '' };

function ProdutosSection() {
  const [produtos, setProdutos]     = useState<Produto[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [editando, setEditando]     = useState<Produto | null>(null);
  const [form, setForm]             = useState(PRODUTO_VAZIO);
  const [saving, setSaving]         = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetchProdutos()
      .then((list) => setProdutos(list as Produto[]))
      .catch(() => {});
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm(PRODUTO_VAZIO);
    setError('');
    setShowForm(true);
  }

  function abrirEdicao(p: Produto) {
    setEditando(p);
    setForm({ codigo: p.codigo, descricao: p.descricao, ciclopadrao: String(p.ciclopadrao), cavidadepadrao: String(p.cavidadepadrao) });
    setError('');
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false);
    setEditando(null);
    setForm(PRODUTO_VAZIO);
    setError('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = {
      codigo:         form.codigo.trim(),
      descricao:      form.descricao.trim(),
      ciclopadrao:    parseInt(form.ciclopadrao),
      cavidadepadrao: parseInt(form.cavidadepadrao),
    };
    try {
      if (editando) {
        const updated = await atualizarProduto(editando.id, payload) as Produto;
        setProdutos((p) => p.map((x) => x.id === editando.id ? updated : x));
      } else {
        const created = await criarProduto(payload) as Produto;
        setProdutos((p) => [...p, created]);
      }
      fecharForm();
    } catch (e: unknown) {
      console.error('[Operis] Erro ao salvar produto:', e);
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 409) setError('Código já existe. Use um código diferente.');
      else setError(editando ? 'Erro ao atualizar produto.' : 'Erro ao criar produto.');
    } finally {
      setSaving(false);
    }
  };

  async function excluir(id: string, descricao: string) {
    if (!confirm(`Desativar o produto "${descricao}"?`)) return;
    setActionId(id); setError('');
    try {
      await removerProduto(id);
      setProdutos((p) => p.filter((x) => x.id !== id));
    } catch {
      setError('Erro ao remover produto.');
    } finally {
      setActionId(null);
    }
  }

  return (
    <SectionCard
      title="Produtos Cadastrados"
      subtitle="Cadastre e edite produtos com ciclo e cavidade padrão"
      icon={<Package size={18} />}
    >
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="space-y-2 mb-4">
        {produtos.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum produto cadastrado.</p>
        )}
        {produtos.map((p) => {
          const busy = actionId === p.id;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-operis-dark/10 flex items-center justify-center text-operis-dark font-bold text-xs flex-shrink-0">
                  {p.codigo.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-operis-dark truncate">{p.descricao}</p>
                  <p className="text-xs text-gray-400">
                    Cód: <span className="font-mono">{p.codigo}</span>
                    {' · '}Ciclo: <strong>{p.ciclopadrao}s</strong>
                    {' · '}Cav: <strong>{p.cavidadepadrao}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => abrirEdicao(p)}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
                  title="Editar produto"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => excluir(p.id, p.descricao)}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                  title="Desativar produto"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="p-4 border border-dashed border-gray-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-operis-dark">{editando ? 'Editar produto' : 'Novo produto'}</p>
            <button type="button" onClick={fecharForm} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Código (ex: FR-12)" required value={form.codigo}
              onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
              className="input text-sm" />
            <input placeholder="Descrição" required value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
              className="input text-sm" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ciclo padrão (s)</label>
              <input type="number" min="1" required value={form.ciclopadrao}
                onChange={(e) => setForm((p) => ({ ...p, ciclopadrao: e.target.value }))}
                className="input text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cavidades padrão</label>
              <input type="number" min="1" required value={form.cavidadepadrao}
                onChange={(e) => setForm((p) => ({ ...p, cavidadepadrao: e.target.value }))}
                className="input text-sm w-full" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={fecharForm} className="btn-ghost text-xs">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
              {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={abrirNovo}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:text-operis-dark hover:border-operis-dark transition-colors font-medium">
          <Plus size={16} /> Adicionar produto
        </button>
      )}
    </SectionCard>
  );
}

// ─── Seção: Aparência ─────────────────────────────────────────────────────────
const CLOCK_TEMAS = [
  {
    key: 'escuro',
    label: 'Escuro',
    preview: { card: 'bg-[#1a2236]', time: 'text-white', date: 'text-white/60', badge: 'bg-white/10 text-blue-400' },
  },
  {
    key: 'branco',
    label: 'Branco',
    preview: { card: 'bg-white border border-gray-200', time: 'text-gray-900', date: 'text-gray-400', badge: 'bg-gray-100 text-gray-600' },
  },
  {
    key: 'azul',
    label: 'Azul',
    preview: { card: 'bg-blue-600', time: 'text-white', date: 'text-white/70', badge: 'bg-white/20 text-white' },
  },
  {
    key: 'preto',
    label: 'Preto',
    preview: { card: 'bg-black', time: 'text-white', date: 'text-white/50', badge: 'bg-white/10 text-amber-400' },
  },
] as const;

export type ClockTema = typeof CLOCK_TEMAS[number]['key'];

function ClockTemaSection() {
  const [tema, setTema] = useState<ClockTema>('escuro');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetchConfiguracao()
      .then((cfg) => { if (cfg.clock_tema) setTema(cfg.clock_tema as ClockTema); })
      .catch(() => {});
  }, []);

  const salvar = async (novoTema: ClockTema) => {
    setTema(novoTema);
    setLoading(true);
    try {
      await saveConfiguracao({ clock_tema: novoTema });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Aparência" subtitle="Personalize o tema do relógio digital" icon={<Palette size={18} />}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CLOCK_TEMAS.map((t) => {
          const sel = tema === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => salvar(t.key)}
              disabled={loading}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                sel ? 'border-operis-dark shadow-sm' : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              {/* Mini preview do relógio */}
              <div className={`w-full rounded-lg p-3 flex flex-col items-center gap-1 ${t.preview.card}`}>
                <p className={`font-mono text-base font-bold tabular-nums leading-none ${t.preview.time}`}>
                  15:21:40
                </p>
                <p className={`text-[9px] ${t.preview.date}`}>Qua, 03 Junho</p>
                <span className={`text-[9px] font-semibold rounded-full px-2 py-0.5 ${t.preview.badge}`}>
                  2º Turno
                </span>
              </div>
              <span className={`text-xs font-semibold ${sel ? 'text-operis-dark' : 'text-gray-500'}`}>
                {t.label}
              </span>
              {sel && (
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                  {saved ? <><CheckCircle size={10} /> Salvo</> : loading ? <Loader2 size={10} className="animate-spin" /> : '✓ Ativo'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { data: authUser, isLoading } = useAuthUser();

  useEffect(() => {
    if (!isLoading && authUser) {
      const r = (authUser as { role?: string }).role;
      if (r !== 'ADMIN' && r !== 'SUPERVISOR') router.replace('/central');
    }
  }, [authUser, isLoading, router]);

  const role = (authUser as { role?: string })?.role;
  if (isLoading || !authUser || (role !== 'ADMIN' && role !== 'SUPERVISOR')) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <SheetsSection />
      <LimitesSection />
      <ProdutosSection />
      <ClockTemaSection />
      <UsuariosSection currentRole={role} />
      <AlertRulesSection />
    </div>
  );
}
