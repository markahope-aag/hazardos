import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlatformHeader } from '@/components/layout/platform-header'

// Mock child components
vi.mock('@/components/ui/logo', () => ({
  LogoHorizontal: () => <div data-testid="logo">Logo</div>,
}))

vi.mock('@/components/layout/platform-user-menu', () => ({
  PlatformUserMenu: ({ userEmail, userRole }: any) => (
    <div data-testid="user-menu">
      <span>{userEmail}</span>
      <span>{userRole}</span>
    </div>
  ),
}))

describe('PlatformHeader', () => {
  it('renders the logo', () => {
    render(<PlatformHeader userEmail="admin@example.com" userRole="admin" />)

    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders Platform Admin title', () => {
    render(<PlatformHeader userEmail="admin@example.com" userRole="admin" />)

    expect(screen.getByText('Platform Admin')).toBeInTheDocument()
  })

  it('renders user menu with email', () => {
    render(<PlatformHeader userEmail="admin@example.com" userRole="admin" />)

    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('passes user role to user menu', () => {
    render(<PlatformHeader userEmail="admin@example.com" userRole="super_admin" />)

    expect(screen.getByText('super_admin')).toBeInTheDocument()
  })

  it('renders header element', () => {
    const { container } = render(<PlatformHeader userEmail="admin@example.com" userRole="admin" />)

    expect(container.querySelector('header')).toBeInTheDocument()
  })
})
