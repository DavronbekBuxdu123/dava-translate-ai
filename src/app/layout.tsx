import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'DAVA Translate AI — Til to‘siqsiz muloqot',
    template: '%s | DAVA Translate AI',
  },
  description: 'O‘zbekcha va ruscha tabiiy tarjima, ovozli suhbat va sayohat iboralari.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'DAVA' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#315CF5' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
