'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { OperisLayout } from '@/components/operis-layout';
import { type ReactNode } from 'react';

const NO_LAYOUT_PATHS = ['/login', '/tv'];

export function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (NO_LAYOUT_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }
  return (
    <AuthGuard>
      <OperisLayout>{children}</OperisLayout>
    </AuthGuard>
  );
}
