'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { enablePreviewMode, login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('admin@operis.com.br');
  const [password, setPassword] = useState('operis@2025');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function goTo(path: string) {
    router.push(path);
    router.refresh();
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      goTo('/central');
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        // Backend offline → entra direto em modo visualização
        enablePreviewMode();
        goTo('/central');
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Credenciais inválidas. Verifique e-mail e senha.');
        setLoading(false);
      } else {
        setError('Não foi possível entrar. Verifique se o backend está no ar.');
        setLoading(false);
      }
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
          <div className="flex items-center gap-3 mb-8">
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

          <h1 className="text-white font-bold text-2xl sm:text-3xl mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Acesso ao sistema
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Central de monitoramento industrial em tempo real.
          </p>

          {/* Erro de credenciais */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                style={{ background: 'rgba(3,12,22,0.85)', borderColor: 'rgba(100,160,200,0.25)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  style={{ background: 'rgba(3,12,22,0.85)', borderColor: 'rgba(100,160,200,0.25)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

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
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Entrando...</>
                : 'Entrar no sistema'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: 'rgba(100,160,200,0.1)' }}>
            <p className="text-slate-600 text-xs">OPERIS v1.0.0</p>
            <p className="text-slate-600 text-xs">Sistema Industrial</p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Demo: <span className="text-slate-400">admin@operis.com.br</span> /{' '}
          <span className="text-slate-400">operis@2025</span>
        </p>
      </div>
    </div>
  );
}
