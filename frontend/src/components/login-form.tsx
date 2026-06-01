'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import axios from 'axios';
import { enablePreviewMode, login } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@operis.com.br');
  const [password, setPassword] = useState('operis@2025');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setApiUnavailable(false);

    try {
      await login(email, password);
      router.push('/');
      router.refresh();
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        setApiUnavailable(true);
        setError('A API não está disponível agora. Você pode seguir em modo visualização enquanto o backend não sobe.');
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setError('Credenciais inválidas. Confira email e senha.');
      } else {
        setError('Não foi possível entrar. Verifique se o backend, banco e seed estão configurados.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePreviewAccess() {
    enablePreviewMode();
    router.push('/');
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="section-label">Acesso OPERIS</div>
        <h1>Entrar na central operacional</h1>
        <p>
          Esta tela já deixa o fluxo preparado para autenticação real. Se o backend ainda não estiver no ar,
          ela mostra isso sem quebrar a navegação.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="notice notice--danger">{error}</div> : null}

          <button className="button button--primary button--block" disabled={loading} type="submit">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <button className="button button--ghost button--block" onClick={handlePreviewAccess} type="button">
            {apiUnavailable ? 'Abrir painel em modo visualização' : 'Continuar sem backend'}
          </button>
        </form>

        <div className="login-footer">
          <span>Credenciais seed: admin@operis.com.br / operis@2025</span>
          <Link href="/">Voltar ao painel</Link>
        </div>
      </section>
    </main>
  );
}
