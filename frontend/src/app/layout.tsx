import type { Metadata } from 'next';
import './globals.css';
import { ConditionalLayout } from '@/components/conditional-layout';

export const metadata: Metadata = {
  title: 'OPERIS | Central Operacional Industrial',
  description: 'Monitoramento industrial em tempo real com visão central de produção.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
