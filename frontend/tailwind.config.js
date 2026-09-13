/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0C0E12',
        surface: '#15181F',
        'surface-2': '#1D212B',
        'surface-3': '#252A36',
        line: '#2A2F3A',
        'line-soft': '#21252E',
        text: '#EDEFF3',
        'text-dim': '#9BA3B2',
        'text-mute': '#626B7D',
        gold: {
          DEFAULT: '#B98C4E',
          soft: '#332B1D',
          bright: '#CBA062',
        },
        income: '#4FB477',
        expense: '#D06B5C',
        daniel: '#5B8DEF',
        jamile: '#C77DBB',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Instrument Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: '14px',
        md: '10px',
        sm: '7px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.5)',
        pop: '0 24px 60px -20px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'rise': 'rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'pop-in': 'pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
