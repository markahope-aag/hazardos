import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserMenu } from '@/components/layout/user-menu'
import type { Profile } from '@/types/database'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// Mock the hooks and router
const mockPush = vi.fn()
const mockLogout = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock('@/lib/hooks/use-logout', () => ({
  useLogout: () => ({
    logout: mockLogout,
  }),
}))

const mockUser: SupabaseUser = {
  id: 'user-1',
  email: 'john.doe@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
}

const mockProfile: Profile = {
  id: 'user-1',
  organization_id: 'org-1',
  first_name: 'John',
  last_name: 'Doe',
  role: 'admin',
  is_platform_user: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('UserMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render user information', () => {
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument() // User initials
  })

  it('should render user menu trigger button', () => {
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    expect(triggerButton).toBeInTheDocument()
    expect(triggerButton).toHaveAttribute('aria-label', 'User menu for John Doe')
  })

  it('should show dropdown menu when clicked', async () => {
    const user = userEvent.setup()
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })
  })

  it('should navigate to profile when profile option is clicked', async () => {
    const user = userEvent.setup()
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    await user.click(triggerButton)

    await waitFor(async () => {
      const profileOption = screen.getByText('Profile')
      await user.click(profileOption)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/profile')
  })

  it('should navigate to settings when settings option is clicked', async () => {
    const user = userEvent.setup()
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    await user.click(triggerButton)

    await waitFor(async () => {
      const settingsOption = screen.getByText('Settings')
      await user.click(settingsOption)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/settings')
  })

  it('should call logout when sign out is clicked', async () => {
    const user = userEvent.setup()
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    await user.click(triggerButton)

    await waitFor(async () => {
      const signOutOption = screen.getByText('Sign out')
      await user.click(signOutOption)
    })

    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('should handle user without first/last name', () => {
    const profileWithoutName = { ...mockProfile, first_name: null, last_name: null }
    render(<UserMenu user={mockUser} profile={profileWithoutName} />)

    // When first/last name are null, the component displays empty name area
    // but the initials should come from email
    expect(screen.getByText('J')).toBeInTheDocument() // Should use email initial
    // The aria-label should contain the email as the userName
    const triggerButton = screen.getByRole('button', { name: /user menu for john.doe@example.com/i })
    expect(triggerButton).toBeInTheDocument()
  })

  it('should handle user with only first name', () => {
    const profileWithOnlyFirstName = { ...mockProfile, last_name: null }
    render(<UserMenu user={mockUser} profile={profileWithOnlyFirstName} />)

    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('should format role names correctly', () => {
    const profileWithUnderscoreRole = { ...mockProfile, role: 'tenant_owner' }
    render(<UserMenu user={mockUser} profile={profileWithUnderscoreRole} />)

    expect(screen.getByText('tenant owner')).toBeInTheDocument()
  })

  it('should handle user without email', () => {
    const userWithoutEmail = { ...mockUser, email: undefined }
    const profileWithoutName = { ...mockProfile, first_name: null, last_name: null }
    render(<UserMenu user={userWithoutEmail} profile={profileWithoutName} />)

    expect(screen.getByText('?')).toBeInTheDocument() // Should show fallback initial
  })

  it('should have proper accessibility attributes', () => {
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    expect(triggerButton).toHaveAttribute('aria-label', 'User menu for John Doe')

    // Check aria-hidden attributes
    const userInfo = screen.getByText('John Doe').closest('[aria-hidden="true"]')
    expect(userInfo).toBeInTheDocument()

    const avatar = screen.getByText('J').closest('[aria-hidden="true"]')
    expect(avatar).toBeInTheDocument()
  })

  it('should display user initials correctly', () => {
    const testCases = [
      {
        profile: { ...mockProfile, first_name: 'Alice', last_name: 'Smith' },
        user: mockUser,
        expected: 'A'
      },
      {
        profile: { ...mockProfile, first_name: null, last_name: null },
        user: { ...mockUser, email: 'test@example.com' },
        expected: 'T'
      },
      {
        profile: { ...mockProfile, first_name: null, last_name: null },
        user: { ...mockUser, email: undefined },
        expected: '?'
      }
    ]

    testCases.forEach(({ profile, user, expected }) => {
      const { rerender } = render(<UserMenu user={user} profile={profile} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
      rerender(<div />)
    })
  })

  it('should have proper styling classes', () => {
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    expect(triggerButton).toHaveClass(
      'flex',
      'items-center',
      'space-x-2',
      'hover:bg-gray-50',
      'rounded-lg',
      'p-1',
      'transition-colors'
    )
  })

  it('should show correct user name in dropdown', async () => {
    const user = userEvent.setup()
    render(<UserMenu user={mockUser} profile={mockProfile} />)

    const triggerButton = screen.getByRole('button', { name: /user menu for/i })
    await user.click(triggerButton)

    await waitFor(() => {
      // Should show full name in dropdown header
      const dropdownName = screen.getAllByText('John Doe')
      expect(dropdownName.length).toBeGreaterThan(0)
      
      // Should show email in dropdown
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })
  })
})