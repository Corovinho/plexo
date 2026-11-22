/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        ink: 'var(--text)',
        ink2: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        line: 'var(--border)',
        lineStrong: 'var(--border-strong)',
        accent: 'var(--accent)',
        accentSoft: 'var(--accent-soft)',
        accentFg: 'var(--accent-fg)',
        warm: 'var(--warm)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        sheet: 'var(--shadow-sheet)',
      },
    },
  },
  plugins: [],
};
