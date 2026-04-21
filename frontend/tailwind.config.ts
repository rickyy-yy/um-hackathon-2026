import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F6E56',
        'primary-dark': '#0a5443',
        accent: '#F0DD62',
        surface: '#C6DABF',
        bg: '#F3E9D2',
        alert: '#D64933',
        ink: '#0d1b2a',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(15, 110, 86, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
