'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TurnoProvider, useTurno, type TurnoValue } from '@/contexts/turno-context';
import {
  Home, Calendar, BarChart3, Bell, Settings, TableProperties,
  LogOut, Menu, X, ChevronDown, ChevronLeft, User as UserIcon, Tv, Trash2, type LucideIcon,
} from 'lucide-react';
import { OperisLogoFull } from '@/components/operis-logo';
import { logout, useAlertas, useAuthUser, useContagemAlertas, isPreviewModeEnabled, deletarAlerta, marcarTodosAlertasLidos, deletarTodosAlertasLidos } from '@/lib/api';
import type { Alerta, PaginatedResponse, User } from '@/types/operis';

// Mock para modo preview
const MOCK_BADGE = 6;
const MOCK_ALERTS = [
  { id:'1', machine:'MÁQ 04', title:'Ciclo aumentado +5s acima do padrão', time:'14:30', sev:'danger', dot:'bg-red-500' },
  { id:'2', machine:'MÁQ 10', title:'Máquina parada',                      time:'14:22', sev:'danger', dot:'bg-red-500' },
  { id:'3', machine:'MÁQ 09', title:'Cavidade abaixo do padrão',           time:'14:20', sev:'danger', dot:'bg-red-500' },
  { id:'4', machine:'MÁQ 05', title:'Aguardando matéria prima',            time:'14:26', sev:'warning',dot:'bg-amber-400' },
  { id:'5', machine:'MÁQ 03', title:'Em regulagem prolongada',             time:'14:24', sev:'warning',dot:'bg-amber-400' },
  { id:'6', machine:'MÁQ 06', title:'Troca de produto (Novo OP)',          time:'14:28', sev:'info',   dot:'bg-blue-400' },
];
const MOCK_USER = { name: 'Supervisor', email: 'supervisor@operis.com.br', role: 'SUPERVISOR' as const };

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

function buildNavItems(alertBadge?: number): NavItem[] {
  return [
    { label: 'Central', href: '/central', icon: Home },
    { label: 'Ronda', href: '/ronda', icon: Calendar },
    { label: 'Comparativos', href: '/comparativos', icon: BarChart3 },
    { label: 'Histórico',   href: '/historico',    icon: TableProperties },
    { label: 'Alertas', href: '/alertas', icon: Bell, badge: alertBadge },
    { label: 'Configurações', href: '/configuracoes', icon: Settings },
  ];
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/central': { title: 'Central Operacional', subtitle: 'Monitoramento em tempo real da produção' },
  '/ronda': { title: 'Ronda', subtitle: 'Histórico operacional diário e consolidação por turno' },
  '/comparativos': { title: 'Comparativos', subtitle: 'Análise entre turnos, dias, semanas e meses' },
  '/historico':    { title: 'Histórico',    subtitle: 'Registros diários por máquina — visão de planilha' },
  '/alertas': { title: 'Alertas', subtitle: 'Indicadores de severidade operacional' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Integrações, produtos, usuários e regras' },
  '/perfil': { title: 'Meu Perfil', subtitle: 'Informações pessoais e recados' },
};

const turnos = [
  { value: 'TODOS',    label: 'Todos os Turnos', horario: '' },
  { value: 'PRIMEIRO', label: '1º Turno',         horario: '06:00 – 14:00' },
  { value: 'SEGUNDO',  label: '2º Turno',         horario: '14:00 – 22:00' },
  { value: 'TERCEIRO', label: '3º Turno',         horario: '22:00 – 06:00' },
];

function formatAlertTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function BellAlertItem({ a, onDelete }: { a: { id: string; machine: string; title: string; time: string; dot: string }; onDelete: () => void }) {
  const [tx, setTx]           = useState(0);
  const [settling, setSettling] = useState(false);
  const startX  = useRef(0);
  const startY  = useRef(0);
  const horiz   = useRef(false);
  const active  = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    horiz.current  = false;
    active.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!active.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      horiz.current  = Math.abs(dx) > Math.abs(dy);
      active.current = true;
    }
    if (horiz.current && dx < 0) setTx(Math.max(dx, -90));
  }

  function onTouchEnd() {
    setSettling(true);
    if (tx < -55) { onDelete(); }
    else           { setTx(0); }
    setTimeout(() => setSettling(false), 200);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 pointer-events-none">
        <Trash2 size={14} className="text-white" />
      </div>
      <div
        style={{ transform: `translateX(${tx}px)`, transition: settling ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative bg-white flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group cursor-default"
      >
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-operis-dark">{a.machine}</p>
          <p className="text-xs text-gray-500 truncate">{a.title}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-gray-400">{a.time}</span>
          <button
            onClick={onDelete}
            className="hidden group-hover:flex p-0.5 rounded text-gray-300 hover:text-red-500 transition-colors"
            title="Apagar"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function OperisLayoutInner({ children }: { children: ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { data: contagem, mutate: mutateContagem } = useContagemAlertas();
  const { data: alertasData, mutate: mutateAlerts } = useAlertas({ lido: false, limit: 6 });
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  async function handleBellDelete(id: string) {
    setHiddenIds(prev => new Set([...prev, id]));
    try { await deletarAlerta(id); await mutateAlerts(); await mutateContagem(); }
    catch { setHiddenIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  }

  async function handleBellDeleteAll() {
    try {
      await marcarTodosAlertasLidos();
      await deletarTodosAlertasLidos();
      setHiddenIds(new Set());
      await mutateAlerts();
      await mutateContagem();
    } catch { /* silent */ }
  }
  const { data: authUser } = useAuthUser();

  const isPreview = isPreviewModeEnabled();

  // Badge: usa dado real (token) ou mock (preview)
  const naoLidos = (contagem as { total?: number } | undefined)?.total ?? (isPreview ? MOCK_BADGE : 0);
  const navItems = buildNavItems(naoLidos > 0 ? naoLidos : undefined);

  // Alertas recentes: usa dado real ou mock
  const apiAlerts = (alertasData as PaginatedResponse<Alerta> | undefined)?.items;
  const recentAlerts = apiAlerts ?? [];
  const bellAlerts = (apiAlerts
    ? recentAlerts.map((a) => ({
        id: a.id,
        machine: a.maquina,
        title: a.titulo,
        time: new Date(a.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sev: a.severidade === 'CRITICO' ? 'danger' : a.severidade === 'ATENCAO' ? 'warning' : 'info',
        dot: a.severidade === 'CRITICO' ? 'bg-red-500' : a.severidade === 'ATENCAO' ? 'bg-amber-400' : 'bg-blue-400',
      }))
    : MOCK_ALERTS).filter(a => !hiddenIds.has(a.id));

  // Usuário: usa dado real ou mock
  const user = (authUser as User | undefined) ?? (isPreview ? MOCK_USER : undefined);
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [turnoOpen,     setTurnoOpen]     = useState(false);
  const [bellOpen,      setBellOpen]      = useState(false);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const { turnoAtual, setTurnoAtual } = useTurno();
  const turnoRef  = useRef<HTMLDivElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (turnoRef.current && !turnoRef.current.contains(e.target as Node)) setTurnoOpen(false);
      if (bellRef.current  && !bellRef.current.contains(e.target as Node))  setBellOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const turnoLabel = turnos.find((t) => t.value === turnoAtual)?.label ?? '2º Turno';

  const pageInfo = pageTitles[pathname] ?? { title: 'OPERIS', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      {/* ── Sidebar ── */}
      <aside
        className={`sidebar flex-shrink-0 flex flex-col overflow-hidden
          fixed inset-y-0 left-0 z-50 transition-[transform,width] duration-300
          w-[210px]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:h-full
          ${desktopSidebarOpen ? 'lg:w-[210px]' : 'lg:w-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/10 flex-shrink-0">
          <OperisLogoFull />
          {/* Fechar — mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white flex-shrink-0 ml-1"
          >
            <X size={16} />
          </button>
          {/* Fechar — desktop */}
          <button
            onClick={() => setDesktopSidebarOpen(false)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ml-1"
            title="Recolher menu"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Nav — flex-1 com overflow para telas pequenas */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar bottom cards — sempre visíveis, não crescem */}
        <div className="px-3 pb-3 pt-2 space-y-2 flex-shrink-0 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)] flex-shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Sincronização</span>
            </div>
            <p className="text-white text-[11px] font-semibold">Atualizado há 1 min</p>
            <p className="text-slate-400 text-[9px] mt-0.5">Próxima atualização 00:45</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Turno Atual</p>
            <p className="text-white text-xs font-bold">{turnoLabel}</p>
            <p className="text-slate-400 text-[9px]">
              {turnoAtual === 'PRIMEIRO' ? '06:00 – 14:00' : turnoAtual === 'SEGUNDO' ? '14:00 – 22:00' : '22:00 – 06:00'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 pb-5 border-t border-white/10 pt-3 flex items-center justify-between">
          <span className="text-slate-500 text-[10px]">OPERIS v1.0.0</span>
          <button
            onClick={() => { if (window.confirm('Deseja sair da sua conta?')) logout(); }}
            title="Sair"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3">
            {/* Abrir mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            {/* Abrir desktop (quando sidebar está recolhida) */}
            {!desktopSidebarOpen && (
              <button
                onClick={() => setDesktopSidebarOpen(true)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100"
                title="Expandir menu"
              >
                <Menu size={20} className="text-gray-600" />
              </button>
            )}

            {/* Page title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-operis-dark leading-none truncate">{pageInfo.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block truncate">{pageInfo.subtitle}</p>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">

              {/* ── Turno selector ── */}
              <div ref={turnoRef} className="relative hidden sm:block">
                <button
                  onClick={() => { setTurnoOpen(!turnoOpen); setUserMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-500 text-xs">Turno atual:</span>
                  <span className="font-semibold text-operis-dark">{turnoLabel}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${turnoOpen ? 'rotate-180' : ''}`} />
                </button>

                {turnoOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg z-50 overflow-hidden">
                    <p className="px-4 pt-3 pb-1 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Selecionar turno</p>
                    {turnos.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => { setTurnoAtual(t.value as TurnoValue); setTurnoOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          turnoAtual === t.value ? 'text-operis-dark font-semibold' : 'text-gray-600'
                        }`}
                      >
                        <span>{t.label}</span>
                        <span className="text-[11px] text-gray-400">{t.horario}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sync status ── */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Sincronizado há 1 min</span>
              </div>

              {/* ── Botão TV ── */}
              <a
                href="/tv"
                title="Abrir modo TV (tela cheia)"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-600 hover:bg-operis-dark hover:text-white hover:border-operis-dark transition-colors"
              >
                <Tv size={14} />
                <span>Modo TV</span>
              </a>

              {/* ── Bell dropdown ── */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => { setBellOpen(!bellOpen); setTurnoOpen(false); setUserMenuOpen(false); }}
                  className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Bell size={18} className="text-gray-600" />
                  {naoLidos > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {naoLidos > 9 ? '9+' : naoLidos}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-bold text-operis-dark">Alertas</p>
                        <p className="text-[10px] text-gray-400">{naoLidos} não lidos</p>
                      </div>
                      {naoLidos > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{naoLidos} novos</span>
                      )}
                    </div>

                    {/* Alert list */}
                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                      {bellAlerts.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-gray-400 text-center">Nenhum alerta pendente</p>
                      ) : bellAlerts.map((a) => (
                        <BellAlertItem key={a.id} a={a} onDelete={() => handleBellDelete(a.id)} />
                      ))}
                    </div>

                    {/* Footer CTA */}
                    <div className="border-t border-gray-100 p-3 flex gap-2">
                      <Link
                        href="/alertas"
                        onClick={() => setBellOpen(false)}
                        className="flex-1 text-center text-xs font-bold py-2 bg-operis-dark text-white rounded-xl hover:bg-operis-accent transition-colors"
                      >
                        Ver todos os alertas
                      </Link>
                      {bellAlerts.length > 0 && (
                        <button
                          onClick={handleBellDeleteAll}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Apagar todos os alertas"
                        >
                          <Trash2 size={12} /> Apagar tudo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── User menu ── */}
              <div ref={userRef} className="relative pl-3 border-l border-gray-200">
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); setTurnoOpen(false); }}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm">
                    {(user?.name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-operis-dark leading-none">{user?.name ?? 'Usuário'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {user?.role === 'ADMIN' ? 'Administrador'
                        : user?.role === 'SUPERVISOR' ? 'Supervisor'
                        : user?.role === 'OPERADOR' ? 'Operador'
                        : user?.role === 'VISUALIZADOR' ? 'Visualizador'
                        : 'Operacional'}
                    </p>
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 hidden sm:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-operis-dark">{user?.name ?? 'Usuário'}</p>
                      <p className="text-xs text-gray-400">{user?.email ?? '—'}</p>
                    </div>
                    <Link
                      href="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon size={15} className="text-gray-400" />
                      Meu perfil
                    </Link>
                    <button
                      onClick={() => { if (window.confirm('Deseja sair da sua conta?')) { setUserMenuOpen(false); logout(); } }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50"
                    >
                      <LogOut size={15} />
                      Sair
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-3 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function OperisLayout({ children }: { children: ReactNode }) {
  return (
    <TurnoProvider>
      <OperisLayoutInner>{children}</OperisLayoutInner>
    </TurnoProvider>
  );
}
