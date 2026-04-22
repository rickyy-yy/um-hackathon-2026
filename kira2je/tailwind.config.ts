import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kira: {
          teal: '#0F6E56',
          yellow: '#F0DD62',
          sage: '#C6DABF',
          cream: '#F3E9D2',
          red: '#D64933',
          dark: '#1A2E28',
          muted: '#5E6B5A',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
