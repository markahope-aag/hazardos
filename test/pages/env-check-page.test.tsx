import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EnvCheckPage from '@/app/env-check/page'

describe('EnvCheckPage', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('renders without crashing', () => {
    expect(() => render(<EnvCheckPage />)).not.toThrow()
  })

  it('displays environment check heading', () => {
    render(<EnvCheckPage />)
    expect(screen.getByText('Environment Check')).toBeInTheDocument()
  })

  it('shows Supabase URL status', () => {
    render(<EnvCheckPage />)
    expect(screen.getByText('Supabase URL:')).toBeInTheDocument()
  })

  it('shows Supabase Key status', () => {
    render(<EnvCheckPage />)
    expect(screen.getByText('Supabase Key:')).toBeInTheDocument()
  })

  it('shows success indicators when env vars are set', () => {
    // Environment variables are set in test setup
    render(<EnvCheckPage />)

    const setIndicators = screen.getAllByText('✓ Set')
    expect(setIndicators).toHaveLength(2)
  })

  it('shows success message when all vars configured', () => {
    render(<EnvCheckPage />)
    expect(screen.getByText('✓ Environment variables are configured correctly!')).toBeInTheDocument()
  })
})
