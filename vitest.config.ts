import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    globals: true,
    css: true,
    exclude: ['node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'next.config.mjs',
        'tailwind.config.js',
        'postcss.config.js',
        '.next/',
        'dist/',
        'build/',
      ],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'types/**/*.{ts,tsx}',
      ],
      // Thresholds raised from the ratchet baseline (37/35/33/27) back toward
      // the original audit targets (40/38/38/31). Values verified against
      // measured coverage after recent test additions; raise incrementally
      // as coverage improves.
      thresholds: {
        lines: 39,
        statements: 37,
        functions: 35,
        branches: 29,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})