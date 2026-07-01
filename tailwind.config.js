/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Retuned accent scale (kept under `teal` key for compatibility across the app).
        // Refined bank-blue — confident, calm, not neon.
        teal: {
          50:  '#eef3ff',
          100: '#dbe5ff',
          200: '#bccfff',
          300: '#8fadff',
          400: '#5c85ff',
          500: '#3a68f5',
          600: '#1e5eff',
          700: '#1848d6',
          800: '#1a3ba8',
          900: '#1b3585',
          950: '#131f4d',
        },
        ink: {
          DEFAULT: '#10131a',
          soft: '#1b1f2a',
        },
        slate: {
          925: '#0a0c10',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 19 26 / 0.04)',
        pop: '0 12px 32px -12px rgb(16 19 26 / 0.18)',
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-in': 'fadeUp 0.3s ease-out',
        'slide-up': 'fadeUp 0.3s ease-out',
        'slide-down': 'fadeIn 0.25s ease-out',
        'scale-in': 'fadeIn 0.25s ease-out',
        'bounce-in': 'fadeUp 0.3s ease-out',
        'card-enter': 'fadeUp 0.3s ease-out',
        'stagger-fade': 'fadeUp 0.3s ease-out',
        'count-up': 'fadeIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'skelPulse 1.4s ease-in-out infinite',
        'float': 'none',
        'wiggle': 'none',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        skelPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      transitionDelay: {
        '0': '0ms', '50': '50ms', '100': '100ms', '150': '150ms',
        '200': '200ms', '250': '250ms', '300': '300ms', '350': '350ms',
        '400': '400ms', '450': '450ms', '500': '500ms',
      },
    },
  },
  plugins: [],
}
