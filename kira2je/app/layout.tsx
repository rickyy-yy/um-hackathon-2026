import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Kira2 je — Faham menu anda dalam 5 minit',
  description: 'Penasihat menu AI untuk kedai makan Malaysia',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F6E56',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body className="bg-kira-cream text-kira-dark">
        <div className="mx-auto max-w-md min-h-screen">{children}</div>
      </body>
    </html>
  );
}
