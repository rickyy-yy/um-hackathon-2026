import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FDFBF7',   // main app bg, cards
          100: '#F6F1EA',  // page bg, section fills
          200: '#E8E0D4',  // borders, dividers
        },
        ink: {
          primary: '#2C2418',   // headings, body, numbers
          secondary: '#A89880', // labels, captions, muted
        },
        accent: {
          primary: '#C4541E',   // CTAs, active states, primary buttons
          secondary: '#5B7F6E', // success, positive indicators, profit
        },
        danger: '#B83A2A',      // errors, loss, negative trends
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
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
