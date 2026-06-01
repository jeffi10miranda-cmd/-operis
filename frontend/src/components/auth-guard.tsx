'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasApiAccess } from '@/lib/api';

const PUBLIC_PATHS = ['/login'];

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Controla o check client-side para evitar hydration mismatch
  // (localStorage só existe no browser — server sempre retorna false)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isPublic && !hasApiAccess()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [isPublic, router]);

  // Página pública: sempre renderiza (login page não precisa do guard)
  if (isPublic) return <>{children}</>;

  // Página protegida: aguarda check client-side para evitar flash e hydration error
  if (!ready) return null;

  return <>{children}</>;
}
