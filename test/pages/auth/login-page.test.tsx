import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

// Mock the LoginForm component since it has its own tests
vi.mock('@/components/auth/login-form', () => ({
  default: () => <div data-testid="login-form">Login Form</div>,
}))

describe('LoginPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<LoginPage />)).not.toThrow()
  })

  it('displays welcome heading', () => {
    render(<LoginPage />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('displays sign in prompt', () => {
    render(<LoginPage />)
    expect(screen.getByText('Enter your email to sign in to your account')).toBeInTheDocument()
  })

  it('renders the login form component', () => {
    render(<LoginPage />)
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('displays signup link', () => {
    render(<LoginPage />)
    const signupLink = screen.getByRole('link', { name: /don't have an account\? sign up/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })
})
