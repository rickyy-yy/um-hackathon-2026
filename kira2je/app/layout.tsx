import './globals.css';
import type { Metadata, Viewport } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { LocaleProvider } from '@/lib/i18n/client';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Kira2 je',
  description: 'AI menu profitability strategist for Malaysian F&B',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F6E56',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="bg-kira-cream text-kira-dark">
        <LocaleProvider locale={locale}>
          <div className="mx-auto max-w-md min-h-screen relative flex flex-col">
            <LanguageToggle />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
