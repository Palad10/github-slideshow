import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4A534',
          navy: '#1A1A4E',
          purple: '#7B2D8E',
          'navy-light': '#2A2A6E',
          'gold-light': '#E8C45A',
          'purple-light': '#9B4DAE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
