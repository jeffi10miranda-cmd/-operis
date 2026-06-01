'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, Mail, Shield, User } from 'lucide-react';
import { isPreviewModeEnabled } from '@/lib/api';

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
  id: string;
  text: string;
  colorId: string;
  createdAt: string;
  pinned: boolean;
}

const STORAGE_KEY = 'operis_postits';

function getNoteColor(id: string) {
  return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Cartão post-it ───────────────────────────
function PostItCard({
  note,
  onDelete,
  onUpdate,
  onColorChange,
  onTogglePin,
}: {
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

  function handleBlur() {
    setEditing(false);
    onUpdate(note.id, local);
  }

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      const len = textRef.current.value.length;
      textRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  return (
    <div
      className="rounded-2xl flex flex-col shadow-md hover:shadow-lg transition-shadow group"
      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}
    >
      {/* Header do post-it */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-2xl"
        style={{ background: color.header }}
      >
        {/* Pin */}
        <button
          onClick={() => onTogglePin(note.id)}
          className="text-gray-500 hover:text-gray-800 transition-colors text-sm leading-none"
          title={note.pinned ? 'Desafixar' : 'Fixar'}
        >
          {note.pinned ? '📌' : '📎'}
        </button>

        {/* Seletor de cor */}
        <div className="flex gap-1">
          {NOTE_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => onColorChange(note.id, c.id)}
              title={c.label}
              className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${note.colorId === c.id ? 'ring-2 ring-gray-600 ring-offset-1' : ''}`}
              style={{ background: c.header }}
            />
          ))}
        </div>

        {/* Deletar */}
        <button
          onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
          title="Excluir"
        >
          <X size={14} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-3" onClick={() => setEditing(true)}>
        {editing ? (
          <textarea
            ref={textRef}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={handleBlur}
            rows={6}
            className="w-full resize-none text-sm text-gray-800 bg-transparent outline-none leading-relaxed placeholder-gray-400"
            placeholder="Escreva seu recado..."
          />
        ) : (
          <p
            className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px] cursor-text"
            style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
          >
            {local || <span className="text-gray-400 italic text-xs">Clique para editar...</span>}
          </p>
        )}
      </div>

      {/* Rodapé */}
      <div className="px-3 pb-2.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{formatDate(note.createdAt)}</span>
        {note.pinned && (
          <span className="text-[10px] font-semibold text-gray-500 bg-white/60 px-1.5 py-0.5 rounded-full">Fixado</span>
        )}
      </div>
    </div>
  );
}

// ── Página de perfil ─────────────────────────
const MOCK_USER = {
  name: 'Supervisor',
  email: 'supervisor@operis.com.br',
  role: 'SUPERVISOR' as const,
};

const ROLE_LABEL: Record<string, { label: string; cls: string }> = {
  ADMIN:        { label: 'Administrador', cls: 'bg-red-100 text-red-700' },
  SUPERVISOR:   { label: 'Supervisor',    cls: 'bg-blue-100 text-blue-700' },
  OPERADOR:     { label: 'Operador',      cls: 'bg-green-100 text-green-700' },
  VISUALIZADOR: { label: 'Visualizador',  cls: 'bg-gray-100 text-gray-600' },
};

export default function PerfilPage() {
  const [notes, setNotes] = useState<PostIt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const isPreview = isPreviewModeEnabled();
  const user = MOCK_USER;
  const roleInfo = ROLE_LABEL[user.role] ?? ROLE_LABEL.OPERADOR;

  // Carrega notas do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // Persiste notas
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, loaded]);

  function addNote() {
    const colors = NOTE_COLORS.map(c => c.id);
    const usedCounts = Object.fromEntries(colors.map(c => [c, notes.filter(n => n.colorId === c).length]));
    const leastUsed = colors.reduce((a, b) => usedCounts[a] <= usedCounts[b] ? a : b);
    const novo: PostIt = {
      id: `note-${Date.now()}`,
      text: '',
      colorId: leastUsed,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setNotes(prev => [novo, ...prev]);
  }

  function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  function updateNote(id: string, text: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
  }

  function changeColor(id: string, colorId: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, colorId } : n));
  }

  function togglePin(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  // Ordenar: fixados primeiro, depois por data
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Card de perfil */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-operis-dark to-operis-accent flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-2xl font-black">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-operis-dark">{user.name}</h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleInfo.cls}`}>
                {roleInfo.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Mail size={14} className="text-gray-400" />
                {user.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Shield size={14} className="text-gray-400" />
                {roleInfo.label}
              </span>
            </div>
          </div>

          {isPreview && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
              Modo visualização
            </span>
          )}
        </div>
      </div>

      {/* Seção de recados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-operis-dark">Mural de Recados</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Seus post-its ficam salvos neste navegador.{' '}
              {notes.length > 0 && `${notes.length} recado${notes.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <button onClick={addNote} className="btn-primary gap-2">
            <Plus size={15} /> Nova nota
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-base font-semibold text-gray-600">Nenhum recado ainda</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Clique em "Nova nota" para criar seu primeiro post-it.
            </p>
            <button onClick={addNote} className="btn-primary gap-2 mx-auto">
              <Plus size={14} /> Criar primeiro recado
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map(note => (
              <PostItCard
                key={note.id}
                note={note}
                onDelete={deleteNote}
                onUpdate={updateNote}
                onColorChange={changeColor}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
