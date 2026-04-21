import '@/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kira2 Je — AI Business Advisor untuk F&B',
  description:
    'Faham menu anda dalam 5 minit. AI business advisor untuk kedai, gerai, warung & cafe.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
