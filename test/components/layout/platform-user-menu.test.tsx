import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlatformUserMenu } from '@/components/layout/platform-user-menu'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock useLogout
const mockLogout = vi.fn()
vi.mock('@/lib/hooks/use-logout', () => ({
  useLogout: () => ({
    logout: mockLogout,
  }),
}))

describe('PlatformUserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Back to Dashboard button', () => {
    render(<PlatformUserMenu userEmail="admin@example.com" userRole="platform_admin" />)

    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('renders user initials', () => {
    render(<PlatformUserMenu userEmail="admin@example.com" userRole="platform_admin" />)

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows Platform Admin for platform_admin role', () => {
    render(<PlatformUserMenu userEmail="admin@example.com" userRole="platform_admin" />)

    expect(screen.getByText('Platform Admin')).toBeInTheDocument()
  })

  it('shows Platform Owner for platform_owner role', () => {
    render(<PlatformUserMenu userEmail="admin@example.com" userRole="platform_owner" />)

    expect(screen.getByText('Platform Owner')).toBeInTheDocument()
  })

  it('navigates to dashboard when Back to Dashboard is clicked', async () => {
    const user = userEvent.setup()
    render(<PlatformUserMenu userEmail="admin@example.com" userRole="platform_admin" />)

    await user.click(screen.getByText('Back to Dashboard'))

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows ? for empty email', () => {
    render(<PlatformUserMenu userEmail="" userRole="platform_admin" />)

    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
