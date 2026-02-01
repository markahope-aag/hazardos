import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'text-summary', 'json'],
      include: ['lib/**/*.ts', 'lib/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'lib/supabase/**',
        'lib/services/**',
        'lib/hooks/**',
        'lib/middleware/**',
        'lib/pdf/**', // React PDF components require complex mocking
        'lib/stores/photo-queue-store.ts', // Requires IndexedDB mocking
        'lib/stores/survey-store.ts', // Zustand store with external dependencies
        'lib/stores/survey-types.ts', // Type definitions only, no logic to test
        'lib/utils/api-handler.ts', // Requires Next.js server mocking
        'lib/validations/index.ts', // Re-export only
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})