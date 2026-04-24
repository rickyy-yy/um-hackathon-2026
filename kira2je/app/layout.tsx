import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { getLocale } from '@/lib/i18n/server';
import { LocaleProvider } from '@/lib/i18n/client';

export const metadata: Metadata = {
  title: 'Kira2 je',
  description: 'AI menu profitability strategist for Malaysian F&B',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F6E56',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="bg-kira-cream text-kira-dark">
        <LocaleProvider locale={locale}>
          <div className="min-h-screen relative">
            {children}
          </div>
          <Toaster position="top-center" richColors />
        </LocaleProvider>
      </body>
    </html>
  );
}
