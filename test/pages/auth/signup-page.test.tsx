import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignupPage from '@/app/(auth)/signup/page'

// Mock the SignupForm component since it has its own tests
vi.mock('@/components/auth/signup-form', () => ({
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
}))

describe('SignupPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<SignupPage />)).not.toThrow()
  })

  it('displays create account heading', () => {
    render(<SignupPage />)
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('displays free trial prompt', () => {
    render(<SignupPage />)
    expect(screen.getByText('Start your 14-day free trial. No credit card required.')).toBeInTheDocument()
  })

  it('renders the signup form component', () => {
    render(<SignupPage />)
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()
  })

  it('displays login link', () => {
    render(<SignupPage />)
    const loginLink = screen.getByRole('link', { name: /already have an account\? sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('displays terms of service link', () => {
    render(<SignupPage />)
    const termsLink = screen.getByRole('link', { name: /terms of service/i })
    expect(termsLink).toBeInTheDocument()
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('displays privacy policy link', () => {
    render(<SignupPage />)
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i })
    expect(privacyLink).toBeInTheDocument()
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })
})
