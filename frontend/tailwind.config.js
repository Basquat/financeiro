/** @type {import('tailwindcss').Config} */

// Themed colors live as RGB channels in index.css (:root = light, .dark = dark).
// `ink` and `gold` are aliases of `canvas` and `brand` for screens written against the old names.
// `pine` and `paper` never change: they paint brand panels (hero card, login art) in both themes.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const canvas = v('canvas');
const brand = { DEFAULT: v('brand'), bright: v('brand-bright'), soft: v('brand-soft'), deep: v('brand-deep') };

module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas,
        ink: canvas,
        surface: v('surface'),
        'surface-2': v('surface-2'),
        'surface-3': v('surface-3'),
        line: v('line'),
        'line-soft': v('line-soft'),
        text: v('text'),
        'text-dim': v('text-dim'),
        'text-mute': v('text-mute'),
        brand,
        gold: brand,
        lime: { DEFAULT: '#D4EF6F', soft: v('lime-soft') },
        income: v('income'),
        expense: v('expense'),
        daniel: v('daniel'),
        jamile: v('jamile'),
        'chart-in': v('chart-in'),
        'chart-out': v('chart-out'),
        pine: '#1D4A3A',
        paper: '#F4F1EA',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        xl: '22px',
        lg: '16px',
        md: '11px',
        sm: '7px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(23,26,23,0.03), 0 1px 2px rgba(23,26,23,0.06)',
        lift: '0 1px 2px rgba(23,26,23,0.06), 0 12px 28px -14px rgba(23,26,23,0.22)',
        pop: '0 28px 60px -24px rgba(23,26,23,0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'grow-up': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        rise: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'grow-up': 'grow-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
