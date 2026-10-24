export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        card2: 'var(--card2)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        good: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(-100%)' } },
        pop: { '0%': { opacity: 0, transform: 'scale(.94) translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        sheet: { '0%': { transform: 'translateY(40px)', opacity: 0 }, '100%': { transform: 'none', opacity: 1 } },
        fade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      },
      animation: {
        marquee: 'marquee 18s linear infinite',
        pop: 'pop .22s ease-out',
        sheet: 'sheet .25s ease-out',
        fade: 'fade .2s ease-out',
      },
    },
  },
  plugins: [],
};
