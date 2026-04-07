import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignupPage from '@/app/(auth)/signup/page'

// Mock the SignupForm component since it has its own tests
vi.mock('@/components/auth/signup-form', () => ({
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
}))

// Mock the InviteSessionClear component
vi.mock('@/components/auth/invite-session-clear', () => ({
  InviteSessionClear: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn(),
    },
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

async function renderPage(searchParams: { invite?: string } = {}) {
  const page = await SignupPage({ searchParams: Promise.resolve(searchParams) })
  render(page)
}

describe('SignupPage', () => {
  it('renders without crashing', async () => {
    await expect(renderPage()).resolves.not.toThrow()
  })

  it('displays create account heading', async () => {
    await renderPage()
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('displays free trial prompt', async () => {
    await renderPage()
    expect(screen.getByText('Start your 14-day free trial. No credit card required.')).toBeInTheDocument()
  })

  it('renders the signup form component', async () => {
    await renderPage()
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()
  })

  it('displays login link', async () => {
    await renderPage()
    const loginLink = screen.getByRole('link', { name: /already have an account\? sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('displays terms of service link', async () => {
    await renderPage()
    const termsLink = screen.getByRole('link', { name: /terms of service/i })
    expect(termsLink).toBeInTheDocument()
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('displays privacy policy link', async () => {
    await renderPage()
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i })
    expect(privacyLink).toBeInTheDocument()
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })
})
