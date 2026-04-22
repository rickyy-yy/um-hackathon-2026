import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Kira2Lah — AI Business Advisor',
  description: "Understand your menu in 5 minutes. AI business advisor for Malaysian F&B.",
};

// Inline script runs before React hydrates so the correct theme class is on
// <html> before first paint. Prevents the "flash of wrong theme" that would
// otherwise happen on every load.
const NO_FLASH_SCRIPT = `
(function() {
  try {
    var theme = localStorage.getItem('kira2lah.theme') || 'system';
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    if (isDark) document.documentElement.classList.add('dark');
    var lang = localStorage.getItem('kira2lah.language');
    if (lang) document.documentElement.lang = lang;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
