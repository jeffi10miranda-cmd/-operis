import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F3B52]/60 mb-2">OPERIS</p>
        <h1 className="text-5xl font-light text-[#0F3B52] mb-2">404</h1>
        <p className="text-slate-600 text-sm mb-6">
          Esta rota não existe na Central Operacional. Verifique o endereço ou acesse um módulo válido.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/central" className="btn-primary w-full justify-center">
            Ir para a Central
          </Link>
          <Link href="/login" className="btn-ghost w-full justify-center text-sm">
            Fazer login
          </Link>
        </div>
        <p className="text-[11px] text-slate-400 mt-6">
          Frontend: <strong>http://localhost:3002</strong> · API: <strong>http://localhost:3003</strong>
        </p>
      </div>
    </main>
  );
}
