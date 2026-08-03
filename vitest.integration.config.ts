import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Integration tests run against a REAL Postgres with RLS enforced — normally the
 * local stack from `supabase start`. They are deliberately separate from the unit
 * suite in vitest.config.ts, which mocks Supabase and therefore cannot observe a
 * policy at all: a mocked client returns whatever the mock says regardless of what
 * the database would have allowed.
 *
 * Run with: npm run test:integration   (requires `supabase start` first)
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules/**', '**/node_modules/**', '.next/**'],
    // Real network round-trips to Postgres, plus per-file fixture seeding.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Each file seeds its own organisation, but they share one database. Running
    // files sequentially keeps failures readable and avoids cross-file contention
    // on the shared auth schema.
    fileParallelism: false,
    sequence: { concurrent: false },
    retry: 0,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
