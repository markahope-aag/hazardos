import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Geist Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#FF6B35', // HazardOS Orange
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#1F2937', // Navy Blue
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#10B981', // Green
          foreground: '#FFFFFF',
        },
        hazard: {
          orange: '#FF6B35', // HazardOS Orange
          navy: '#1F2937',   // Navy Blue
          gray: '#6B7280',   // Gray (Secondary Text)
        },
      },
    },
  },
  plugins: [],
}

export default config