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
      // Vitest 4 flattened the threshold shape — `thresholds.global` from
      // older configs is silently ignored, which is why the 70% gate
      // wasn't biting. Thresholds below are a ratchet, pinned just under
      // current coverage so regressions fail CI while we work the number
      // up toward the 70% target we actually want.
      thresholds: {
        lines: 40,
        statements: 38,
        functions: 38,
        branches: 31,
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})