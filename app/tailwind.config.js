/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f6f2ea',
        'paper-elev': '#fbf8f2',
        'paper-deep': '#ece6d8',
        ink: '#1a1815',
        'ink-2': '#4b4640',
        'ink-3': '#807872',
        accent: '#b56b1d',
        'accent-2': '#6b3a08',
        'accent-soft': 'rgba(181, 107, 29, 0.12)',
        line: 'rgba(26, 24, 21, 0.10)',
        'line-2': 'rgba(26, 24, 21, 0.18)',
      },
      fontFamily: {
        serif: ['"EB Garamond"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        display: '-0.02em',
      },
    },
  },
  plugins: [],
};
