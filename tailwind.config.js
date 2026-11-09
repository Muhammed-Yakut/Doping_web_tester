/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: {
          50: '#181b26',
          100: '#12141c',
          200: '#0e1017',
          300: '#090a0f',
          border: '#232738'
        },
        brand: {
          emerald: '#10b981',
          neon: '#00ff87',
          amber: '#f59e0b',
          crimson: '#ef4444',
          cyan: '#06b6d4',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-crimson': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)'
      }
    },
  },
  plugins: [],
}
