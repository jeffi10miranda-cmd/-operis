'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, Mail, Shield, User, Lock, KeyRound, Check, Palette, LayoutGrid, List, Monitor } from 'lucide-react';
import { useAuthUser, api } from '@/lib/api';

// ── Cores dos post-its ───────────────────────
const NOTE_COLORS = [
  { id: 'yellow', bg: '#fef9c3', border: '#fde047', header: '#fef08a', label: 'Amarelo' },
  { id: 'green',  bg: '#dcfce7', border: '#86efac', header: '#bbf7d0', label: 'Verde'   },
  { id: 'blue',   bg: '#e0f2fe', border: '#7dd3fc', header: '#bae6fd', label: 'Azul'    },
  { id: 'pink',   bg: '#fce7f3', border: '#f9a8d4', header: '#fbcfe8', label: 'Rosa'    },
  { id: 'orange', bg: '#fff7ed', border: '#fdba74', header: '#fed7aa', label: 'Laranja' },
  { id: 'purple', bg: '#f5f3ff', border: '#c4b5fd', header: '#e9d5ff', label: 'Roxo'    },
];

interface PostIt {
  id: string; text: string; colorId: string; createdAt: string; pinned: boolean;
}

const STORAGE_KEY      = 'operis_postits';
const LAYOUT_PREF_KEY  = 'operis_layout_prefs';

const ROLE_LABEL: Record<string, { label: string; cls: string }> = {
  ADMIN:        { label: 'Administrador', cls: 'bg-red-100 text-red-700' },
  SUPERVISOR:   { label: 'Supervisor',    cls: 'bg-blue-100 text-blue-700' },
  OPERADOR:     { label: 'Operador',      cls: 'bg-green-100 text-green-700' },
  VISUALIZADOR: { label: 'Visualizador',  cls: 'bg-gray-100 text-gray-600' },
};

function getNoteColor(id: string) { return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0]; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function PostItCard({ note, onDelete, onUpdate, onColorChange, onTogglePin }: {
  note: PostIt;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onColorChange: (id: string, colorId: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const color = getNoteColor(note.colorId);
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState(note.text);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function handleBlur() { setEditing(false); onUpdate(note.id, local); }

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      const len = textRef.current.value.length;
      textRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  return (
    <div className="rounded-2xl flex flex-col shadow-md hover:shadow-lg transition-shadow group"
      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}>
      <div className="flex items-center justify-between px-3 py-2 rounded-t-2xl" style={{ background: color.header }}>
        <button onClick={() => onTogglePin(note.id)} className="text-gray-500 hover:text-gray-800 transition-colors text-sm" title={note.pinned ? 'Desafixar' : 'Fixar'}>
          {note.pinned ? '📌' : '📎'}
        </button>
        <div className="flex gap-1">
          {NOTE_COLORS.map(c => (
            <button key={c.id} onClick={() => onColorChange(note.id, c.id)} title={c.label}
              className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${note.colorId === c.id ? 'ring-2 ring-gray-600 ring-offset-1' : ''}`}
              style={{ background: c.header }} />
          ))}
        </div>
        <button onClick={() => onDelete(note.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all" title="Excluir">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 p-3" onClick={() => setEditing(true)}>
        {editing ? (
          <textarea ref={textRef} value={local} onChange={e => setLocal(e.target.value)} onBlur={handleBlur}
            rows={6} className="w-full resize-none text-sm text-gray-800 bg-transparent outline-none leading-relaxed placeholder-gray-400"
            placeholder="Escreva seu recado..." />
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px] cursor-text">
            {local || <span className="text-gray-400 italic text-xs">Clique para editar...</span>}
          </p>
        )}
      </div>
      <div className="px-3 pb-2.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{formatDate(note.createdAt)}</span>
        {note.pinned && <span className="text-[10px] font-semibold text-gray-500 bg-white/60 px-1.5 py-0.5 rounded-full">Fixado</span>}
      </div>
    </div>
  );
}

// ── Seção: Informações da conta ──────────────
function ContaSection({ userId, nome: nomeInicial, email, role }: {
  userId: string; nome: string; email: string; role: string;
}) {
  const [nome,        setNome]        = useState(nomeInicial);
  const [editandoNome, setEditandoNome] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [okNome,       setOkNome]       = useState(false);
  const [erroNome,     setErroNome]     = useState('');

  const [senhaAtual,   setSenhaAtual]   = useState('');
  const [novaSenha,    setNovaSenha]    = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [salvandoPwd,  setSalvandoPwd]  = useState(false);
  const [okPwd,        setOkPwd]        = useState('');
  const [erroPwd,      setErroPwd]      = useState('');

  const roleInfo = ROLE_LABEL[role] ?? ROLE_LABEL.OPERADOR;

  async function salvarNome() {
    if (nome.trim().length < 2) { setErroNome('Nome muito curto.'); return; }
    setSalvandoNome(true); setErroNome('');
    try {
      await api.patch('/auth/profile', { name: nome.trim() });
      setOkNome(true); setEditandoNome(false);
      setTimeout(() => setOkNome(false), 2500);
    } catch { setErroNome('Erro ao salvar nome.'); }
    finally { setSalvandoNome(false); }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha !== confirmSenha) { setErroPwd('As novas senhas não conferem.'); return; }
    if (novaSenha.length < 6)       { setErroPwd('Mínimo 6 caracteres.'); return; }
    setSalvandoPwd(true); setErroPwd(''); setOkPwd('');
    try {
      await api.patch('/auth/change-password', { senhaAtual, novaSenha });
      setOkPwd('Senha alterada com sucesso!');
      setSenhaAtual(''); setNovaSenha(''); setConfirmSenha('');
      setTimeout(() => setOkPwd(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao alterar senha.';
      setErroPwd(msg);
    } finally { setSalvandoPwd(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Card de perfil */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-operis-dark to-operis-accent flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-2xl font-black">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-operis-dark">{nome}</h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleInfo.cls}`}>{roleInfo.label}</span>
            </div>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><Mail size={12} />{email}</p>
          </div>
        </div>

        {/* Editar nome */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            <User size={11} className="inline mr-1" /> Nome de exibição
          </label>
          {editandoNome ? (
            <div className="flex gap-2">
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                className="input flex-1 text-sm" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') { setNome(nomeInicial); setEditandoNome(false); } }} />
              <button onClick={salvarNome} disabled={salvandoNome}
                className="px-3 py-1.5 rounded-lg bg-operis-dark text-white text-xs font-semibold hover:bg-operis-dark/90 disabled:opacity-50">
                {salvandoNome ? '...' : 'Salvar'}
              </button>
              <button onClick={() => { setNome(nomeInicial); setEditandoNome(false); }}
                className="px-3 py-1.5 rounded-lg border text-xs text-gray-500 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700">{nome}</span>
              <button onClick={() => setEditandoNome(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                Editar
              </button>
            </div>
          )}
          {erroNome && <p className="text-xs text-red-500 mt-1">{erroNome}</p>}
          {okNome && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check size={11} /> Nome atualizado!</p>}
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            <Mail size={11} className="inline mr-1" /> E-mail
          </label>
          <div className="p-2.5 bg-gray-50 rounded-xl text-sm text-gray-500">{email}</div>
          <p className="text-[11px] text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
        </div>

        {/* Perfil */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            <Shield size={11} className="inline mr-1" /> Perfil de acesso
          </label>
          <div className="p-2.5 bg-gray-50 rounded-xl flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleInfo.cls}`}>{roleInfo.label}</span>
            <span className="text-xs text-gray-400">Gerenciado pelo administrador</span>
          </div>
        </div>
      </div>

      {/* Trocar senha */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-operis-dark flex items-center gap-2 mb-4">
          <KeyRound size={15} /> Alterar Senha
        </h3>
        <form onSubmit={trocarSenha} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Senha atual</label>
            <input type="password" required value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
              placeholder="••••••••" className="input w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nova senha</label>
            <input type="password" required minLength={6} value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres" className="input w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Confirmar nova senha</label>
            <input type="password" required value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)}
              placeholder="Repita a nova senha"
              className={`input w-full text-sm ${confirmSenha && confirmSenha !== novaSenha ? 'border-red-300' : ''}`} />
            {confirmSenha && confirmSenha !== novaSenha && <p className="text-xs text-red-500 mt-0.5">As senhas não conferem</p>}
          </div>
          {erroPwd && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{erroPwd}</p>}
          {okPwd   && <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg flex items-center gap-1"><Check size={11} />{okPwd}</p>}
          <button type="submit" disabled={salvandoPwd || (!!confirmSenha && confirmSenha !== novaSenha)}
            className="w-full py-2 rounded-xl bg-operis-dark text-white text-sm font-semibold hover:bg-operis-dark/90 disabled:opacity-50 flex items-center justify-center gap-2">
            <Lock size={14} /> {salvandoPwd ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Seção: Layout personalizado ──────────────
const LAYOUT_OPCOES = {
  viewMode:  { label: 'Visualização padrão da Central', opts: [
    { value: 'grid', label: 'Grade',  Icon: LayoutGrid },
    { value: 'list', label: 'Lista',  Icon: List        },
  ]},
  clockTema: { label: 'Tema do relógio digital', opts: [
    { value: 'escuro', label: 'Escuro',  Icon: Monitor },
    { value: 'branco', label: 'Branco',  Icon: Monitor },
    { value: 'azul',   label: 'Azul',    Icon: Monitor },
    { value: 'preto',  label: 'Preto',   Icon: Monitor },
  ]},
} as const;

type LayoutPrefs = { viewMode: 'grid' | 'list'; clockTema: 'escuro' | 'branco' | 'azul' | 'preto' };
const DEFAULT_PREFS: LayoutPrefs = { viewMode: 'grid', clockTema: 'escuro' };

function LayoutSection() {
  const [prefs, setPrefs] = useState<LayoutPrefs>(DEFAULT_PREFS);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_PREF_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  function salvar(novas: LayoutPrefs) {
    setPrefs(novas);
    localStorage.setItem(LAYOUT_PREF_KEY, JSON.stringify(novas));
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-bold text-operis-dark flex items-center gap-2 mb-4">
        <Palette size={15} /> Preferências de Layout
        {salvo && <span className="text-xs text-green-600 font-semibold flex items-center gap-1 ml-2"><Check size={11} /> Salvo</span>}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {(Object.entries(LAYOUT_OPCOES) as [keyof LayoutPrefs, typeof LAYOUT_OPCOES[keyof LayoutPrefs]][]).map(([key, cfg]) => (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cfg.label}</p>
            <div className="flex gap-2">
              {cfg.opts.map(opt => {
                const ativo = prefs[key] === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => salvar({ ...prefs, [key]: opt.value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      ativo ? 'bg-operis-dark text-white border-operis-dark' : 'bg-white text-gray-600 border-gray-200 hover:border-operis-dark'
                    }`}>
                    <opt.Icon size={13} /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────
export default function PerfilPage() {
  const { data: authUser } = useAuthUser();
  const [notes, setNotes]   = useState<PostIt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setNotes(JSON.parse(raw)); } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, loaded]);

  function addNote() {
    const colors = NOTE_COLORS.map(c => c.id);
    const counts = Object.fromEntries(colors.map(c => [c, notes.filter(n => n.colorId === c).length]));
    const least  = colors.reduce((a, b) => counts[a] <= counts[b] ? a : b);
    setNotes(prev => [{ id: `note-${Date.now()}`, text: '', colorId: least, createdAt: new Date().toISOString(), pinned: false }, ...prev]);
  }

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Conta */}
      {authUser && (
        <ContaSection
          userId={authUser.id}
          nome={authUser.name}
          email={authUser.email}
          role={authUser.role}
        />
      )}

      {/* Layout */}
      <LayoutSection />

      {/* Mural de recados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-operis-dark">Mural de Recados</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Seus post-its ficam salvos neste navegador.{notes.length > 0 && ` ${notes.length} recado${notes.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <button onClick={addNote} className="btn-primary gap-2"><Plus size={15} /> Nova nota</button>
        </div>
        {sorted.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-base font-semibold text-gray-600">Nenhum recado ainda</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Clique em "Nova nota" para criar seu primeiro post-it.</p>
            <button onClick={addNote} className="btn-primary gap-2 mx-auto"><Plus size={14} /> Criar primeiro recado</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map(note => (
              <PostItCard key={note.id} note={note}
                onDelete={id => setNotes(p => p.filter(n => n.id !== id))}
                onUpdate={(id, text) => setNotes(p => p.map(n => n.id === id ? { ...n, text } : n))}
                onColorChange={(id, colorId) => setNotes(p => p.map(n => n.id === id ? { ...n, colorId } : n))}
                onTogglePin={id => setNotes(p => p.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
