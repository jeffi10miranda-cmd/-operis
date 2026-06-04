'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, UserPlus, LogIn } from 'lucide-react';
import { enablePreviewMode, login, register } from '@/lib/api';

const inputStyle = {
  background: 'rgba(3,12,22,0.85)',
  borderColor: 'rgba(100,160,200,0.25)',
} as const;

const inputClass =
  'w-full px-4 py-3 rounded-xl border text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-sky-400/50';

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');

  // Login
  const [email,    setEmail]    = useState('admin@operis.com.br');
  const [password, setPassword] = useState('operis@2025');

  // Registro
  const [nome,            setNome]            = useState('');
  const [regEmail,        setRegEmail]        = useState('');
  const [regPwd,          setRegPwd]          = useState('');
  const [regConfirmPwd,   setRegConfirmPwd]   = useState('');

  const [showPwd,      setShowPwd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [sucesso,      setSucesso]      = useState('');

  function goTo(path: string) { router.push(path); router.refresh(); }

  function trocarModo(m: 'login' | 'registro') {
    setModo(m);
    setError('');
    setSucesso('');
  }

  // ── Login ──────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      goTo('/central');
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        enablePreviewMode();
        goTo('/central');
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Credenciais inválidas. Verifique e-mail e senha.');
      } else {
        setError('Não foi possível entrar. Verifique se o backend está no ar.');
      }
      setLoading(false);
    }
  };

  // ── Registro ───────────────────────────────────
  const handleRegistro = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPwd !== regConfirmPwd) { setError('As senhas não conferem.'); return; }
    if (regPwd.length < 6)        { setError('Senha deve ter no mínimo 6 caracteres.'); return; }
    setLoading(true);
    try {
      await register(nome, regEmail, regPwd, regConfirmPwd);
      goTo('/central');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message || 'Erro ao criar conta.')
        : 'Erro ao criar conta.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(87,210,255,0.18) 0%, transparent 40%), linear-gradient(180deg, #071219 0%, #050d15 60%, #040a10 100%)',
      }}
    >
      <div className="w-full max-w-[460px]">
        <div
          className="rounded-3xl p-6 sm:p-8 border"
          style={{
            background: 'linear-gradient(180deg, rgba(12,28,42,0.95) 0%, rgba(8,20,32,0.98) 100%)',
            borderColor: 'rgba(100,160,200,0.15)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 flex items-center justify-center rotate-45 flex-shrink-0">
              <div className="grid grid-cols-2 gap-[3px] -rotate-45">
                <span className="w-[10px] h-[10px] rounded-sm bg-white/90" />
                <span className="w-[10px] h-[10px] rounded-sm bg-white/20" />
                <span className="w-[10px] h-[10px] rounded-sm bg-white/20" />
                <span className="w-[10px] h-[10px] rounded-sm bg-white/90" />
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none tracking-wide">OPERIS</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">Central Operacional</p>
            </div>
          </div>

          {/* Toggle Login / Criar conta */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(3,12,22,0.6)' }}>
            {([
              { key: 'login',    label: 'Entrar',       Icon: LogIn     },
              { key: 'registro', label: 'Criar conta',  Icon: UserPlus  },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => trocarModo(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  modo === key
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <h1 className="text-white font-bold text-xl sm:text-2xl mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {modo === 'login' ? 'Acesso ao sistema' : 'Criar nova conta'}
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {modo === 'login'
              ? 'Central de monitoramento industrial em tempo real.'
              : 'Crie sua conta. O administrador pode ajustar o seu perfil depois.'}
          </p>

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl mb-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 size={15} className="flex-shrink-0" /> {sucesso}
            </div>
          )}

          {/* ── Formulário de Login ── */}
          {modo === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">E-mail</label>
                <input type="email" required autoComplete="email" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                    placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`} style={inputStyle} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <BtnSubmit loading={loading} label="Entrar no sistema" />
            </form>
          )}

          {/* ── Formulário de Registro ── */}
          {modo === 'registro' && (
            <form onSubmit={handleRegistro} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Nome completo</label>
                <input type="text" required minLength={2} autoComplete="name" placeholder="Seu nome"
                  value={nome} onChange={e => setNome(e.target.value)}
                  className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">E-mail</label>
                <input type="email" required autoComplete="email" placeholder="seu@email.com"
                  value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required minLength={6}
                    autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                    value={regPwd} onChange={e => setRegPwd(e.target.value)}
                    className={`${inputClass} pr-11`} style={inputStyle} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} required
                    autoComplete="new-password" placeholder="Repita a senha"
                    value={regConfirmPwd} onChange={e => setRegConfirmPwd(e.target.value)}
                    className={`${inputClass} pr-11 ${regConfirmPwd && regConfirmPwd !== regPwd ? 'border-red-500/60' : ''}`}
                    style={inputStyle} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {regConfirmPwd && regConfirmPwd !== regPwd && (
                  <p className="text-red-400 text-xs mt-1">As senhas não conferem</p>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                A conta será criada com perfil <span className="text-slate-300 font-semibold">Operador</span>. O administrador pode alterar o perfil em Configurações.
              </p>
              <BtnSubmit loading={loading} label="Criar conta" />
            </form>
          )}

          <div className="flex items-center justify-between mt-6 pt-5 border-t" style={{ borderColor: 'rgba(100,160,200,0.1)' }}>
            <p className="text-slate-600 text-xs">OPERIS v1.0.0</p>
            <p className="text-slate-600 text-xs">Sistema Industrial</p>
          </div>
        </div>

        {modo === 'login' && (
          <p className="text-center text-slate-600 text-xs mt-4">
            Demo: <span className="text-slate-400">admin@operis.com.br</span> /{' '}
            <span className="text-slate-400">operis@2025</span>
          </p>
        )}
      </div>
    </div>
  );
}

function BtnSubmit({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-2"
      style={{
        background: loading ? 'rgba(87,210,255,0.3)' : 'linear-gradient(135deg, #57d2ff, #a8edff)',
        color: '#04202e',
        boxShadow: loading ? 'none' : '0 12px 32px rgba(17,168,216,0.3)',
      }}
    >
      {loading ? <><Loader2 size={16} className="animate-spin" /> Aguarde...</> : label}
    </button>
  );
}
