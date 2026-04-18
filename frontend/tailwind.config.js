/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          300: '#86efac', 400: '#4ade80', 500: '#22c55e',
          600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
        },
        // Keep legacy surface/ink for any remaining pages
        surface: { DEFAULT: '#0a0c12', card: '#111420', border: 'rgba(255,255,255,0.07)', hover: '#1a2035' },
        ink:     { DEFAULT: '#f0f4ff', muted: '#8892a4', faint: '#3d4760' },
        amber:   { DEFAULT: '#f59e0b' },
        red:     { DEFAULT: '#ef4444' },
        blue:    { DEFAULT: '#3b82f6' },
        violet:  { DEFAULT: '#8b5cf6' },
      },
      borderRadius: { xl: '1rem', '2xl': '1.5rem', '3xl': '2rem' },
      boxShadow: {
        card: '0 8px 40px rgba(0,0,0,0.45)',
        glow: '0 0 24px rgba(34,197,94,0.25)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}