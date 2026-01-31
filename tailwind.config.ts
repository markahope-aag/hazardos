import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35', // HazardOS Orange
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#1F2937', // Navy
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#10B981', // Green
          foreground: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}

export default config