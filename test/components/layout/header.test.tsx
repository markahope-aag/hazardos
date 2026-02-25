import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock header component
interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface HeaderProps {
  user?: User | null
  title?: string
  showSearch?: boolean
  showNotifications?: boolean
  notificationCount?: number
  onSearch?: (query: string) => void
  onNotificationClick?: () => void
  onProfileClick?: () => void
  onLogout?: () => void
  className?: string
}

const Header = ({
  user,
  title = 'HazardOS',
  showSearch = true,
  showNotifications = true,
  notificationCount = 0,
  onSearch,
  onNotificationClick,
  onProfileClick,
  onLogout,
  className = ''
}: HeaderProps) => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim())
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen)
  }

  const handleProfileClick = () => {
    setIsProfileMenuOpen(false)
    onProfileClick?.()
  }

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    onLogout?.()
  }

  return (
    <header className={`header ${className}`} role="banner">
      <div className="header-container">
        {/* Logo/Title */}
        <div className="header-brand">
          <h1 className="header-title">{title}</h1>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="header-search">
            <form onSubmit={handleSearchSubmit} role="search">
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
                aria-label="Search"
              />
              <button type="submit" className="search-button" aria-label="Submit search">
                🔍
              </button>
            </form>
          </div>
        )}

        {/* Right side actions */}
        <div className="header-actions">
          {/* Notifications */}
          {showNotifications && user && (
            <button
              className="notification-button"
              onClick={onNotificationClick}
              aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
            >
              🔔
              {notificationCount > 0 && (
                <span className="notification-badge" aria-hidden="true">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile */}
          {user ? (
            <div className="profile-dropdown">
              <button
                className="profile-button"
                onClick={toggleProfileMenu}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                aria-label="User menu"
              >
                {user.avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.avatar} alt={user.name} className="profile-avatar" />
                ) : (
                  <div className="profile-avatar-placeholder" aria-hidden="true">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="profile-name">{user.name}</span>
                <span className="dropdown-arrow" aria-hidden="true">▼</span>
              </button>

              {isProfileMenuOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-info">
                    <div className="profile-info-name">{user.name}</div>
                    <div className="profile-info-email">{user.email}</div>
                    <div className="profile-info-role">{user.role}</div>
                  </div>
                  <hr className="profile-menu-divider" />
                  <button
                    className="profile-menu-item"
                    onClick={handleProfileClick}
                    role="menuitem"
                  >
                    Profile Settings
                  </button>
                  <button
                    className="profile-menu-item logout-item"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-actions">
              <button className="login-button">Login</button>
              <button className="signup-button">Sign Up</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

describe('Header', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin'
  }

  const defaultProps = {
    user: mockUser,
    onSearch: vi.fn(),
    onNotificationClick: vi.fn(),
    onProfileClick: vi.fn(),
    onLogout: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render header with title', () => {
      render(<Header />)
      
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByText('HazardOS')).toBeInTheDocument()
    })

    it('should render custom title', () => {
      render(<Header title="Custom App" />)
      
      expect(screen.getByText('Custom App')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<Header className="custom-header" />)
      
      const header = screen.getByRole('banner')
      expect(header).toHaveClass('custom-header')
    })
  })

  describe('search functionality', () => {
    it('should render search input when showSearch is true', () => {
      render(<Header {...defaultProps} showSearch={true} />)
      
      expect(screen.getByRole('search')).toBeInTheDocument()
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
      expect(screen.getByLabelText('Submit search')).toBeInTheDocument()
    })

    it('should not render search when showSearch is false', () => {
      render(<Header {...defaultProps} showSearch={false} />)
      
      expect(screen.queryByRole('search')).not.toBeInTheDocument()
    })

    it('should handle search input changes', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      const searchInput = screen.getByLabelText('Search')
      await user.type(searchInput, 'test query')
      
      expect(searchInput).toHaveValue('test query')
    })

    it('should call onSearch when form is submitted', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(<Header {...defaultProps} onSearch={onSearch} />)
      
      const searchInput = screen.getByLabelText('Search')
      const searchButton = screen.getByLabelText('Submit search')
      
      await user.type(searchInput, 'test query')
      await user.click(searchButton)
      
      expect(onSearch).toHaveBeenCalledWith('test query')
    })

    it('should call onSearch when Enter is pressed', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(<Header {...defaultProps} onSearch={onSearch} />)
      
      const searchInput = screen.getByLabelText('Search')
      
      await user.type(searchInput, 'test query')
      await user.keyboard('{Enter}')
      
      expect(onSearch).toHaveBeenCalledWith('test query')
    })

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(<Header {...defaultProps} onSearch={onSearch} />)
      
      const searchInput = screen.getByLabelText('Search')
      
      await user.type(searchInput, '  test query  ')
      await user.keyboard('{Enter}')
      
      expect(onSearch).toHaveBeenCalledWith('test query')
    })

    it('should not call onSearch for empty query', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(<Header {...defaultProps} onSearch={onSearch} />)
      
      const searchButton = screen.getByLabelText('Submit search')
      await user.click(searchButton)
      
      expect(onSearch).not.toHaveBeenCalled()
    })

    it('should not call onSearch for whitespace-only query', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(<Header {...defaultProps} onSearch={onSearch} />)
      
      const searchInput = screen.getByLabelText('Search')
      
      await user.type(searchInput, '   ')
      await user.keyboard('{Enter}')
      
      expect(onSearch).not.toHaveBeenCalled()
    })
  })

  describe('notifications', () => {
    it('should render notification button when user is logged in', () => {
      render(<Header {...defaultProps} showNotifications={true} />)
      
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    it('should not render notifications when showNotifications is false', () => {
      render(<Header {...defaultProps} showNotifications={false} />)
      
      expect(screen.queryByLabelText(/Notifications/)).not.toBeInTheDocument()
    })

    it('should not render notifications when user is not logged in', () => {
      render(<Header user={null} showNotifications={true} />)
      
      expect(screen.queryByLabelText(/Notifications/)).not.toBeInTheDocument()
    })

    it('should show notification count badge', () => {
      render(<Header {...defaultProps} notificationCount={5} />)
      
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByLabelText('Notifications (5 unread)')).toBeInTheDocument()
    })

    it('should show 99+ for counts over 99', () => {
      render(<Header {...defaultProps} notificationCount={150} />)
      
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should not show badge for zero notifications', () => {
      render(<Header {...defaultProps} notificationCount={0} />)
      
      expect(screen.queryByText('0')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    it('should call onNotificationClick when clicked', async () => {
      const user = userEvent.setup()
      const onNotificationClick = vi.fn()
      render(<Header {...defaultProps} onNotificationClick={onNotificationClick} />)
      
      const notificationButton = screen.getByLabelText('Notifications')
      await user.click(notificationButton)
      
      expect(onNotificationClick).toHaveBeenCalledOnce()
    })
  })

  describe('user profile', () => {
    it('should render user profile when logged in', () => {
      render(<Header {...defaultProps} />)
      
      expect(screen.getByLabelText('User menu')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should render avatar when provided', () => {
      const userWithAvatar = { ...mockUser, avatar: 'https://example.com/avatar.jpg' }
      render(<Header {...defaultProps} user={userWithAvatar} />)
      
      const avatar = screen.getByAltText('John Doe')
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })

    it('should render avatar placeholder when no avatar', () => {
      render(<Header {...defaultProps} />)
      
      expect(screen.getByText('J')).toBeInTheDocument() // First letter of name
    })

    it('should toggle profile menu when clicked', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      const profileButton = screen.getByLabelText('User menu')
      
      // Menu should be closed initially
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      
      // Click to open
      await user.click(profileButton)
      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(profileButton).toHaveAttribute('aria-expanded', 'true')
      
      // Click to close
      await user.click(profileButton)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(profileButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should display user info in profile menu', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      const profileButton = screen.getByLabelText('User menu')
      await user.click(profileButton)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('should call onProfileClick when profile menu item is clicked', async () => {
      const user = userEvent.setup()
      const onProfileClick = vi.fn()
      render(<Header {...defaultProps} onProfileClick={onProfileClick} />)
      
      const profileButton = screen.getByLabelText('User menu')
      await user.click(profileButton)
      
      const profileMenuItem = screen.getByText('Profile Settings')
      await user.click(profileMenuItem)
      
      expect(onProfileClick).toHaveBeenCalledOnce()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument() // Menu should close
    })

    it('should call onLogout when logout is clicked', async () => {
      const user = userEvent.setup()
      const onLogout = vi.fn()
      render(<Header {...defaultProps} onLogout={onLogout} />)
      
      const profileButton = screen.getByLabelText('User menu')
      await user.click(profileButton)
      
      const logoutMenuItem = screen.getByText('Logout')
      await user.click(logoutMenuItem)
      
      expect(onLogout).toHaveBeenCalledOnce()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument() // Menu should close
    })
  })

  describe('unauthenticated state', () => {
    it('should render login/signup buttons when not logged in', () => {
      render(<Header user={null} />)
      
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })

    it('should not render profile or notifications when not logged in', () => {
      render(<Header user={null} />)
      
      expect(screen.queryByLabelText('User menu')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Notifications/)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Header {...defaultProps} />)
      
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
      
      const searchForm = screen.getByRole('search')
      expect(searchForm).toBeInTheDocument()
      
      const profileButton = screen.getByLabelText('User menu')
      expect(profileButton).toHaveAttribute('aria-haspopup', 'menu')
      expect(profileButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should have proper notification aria-label with count', () => {
      render(<Header {...defaultProps} notificationCount={3} />)
      
      expect(screen.getByLabelText('Notifications (3 unread)')).toBeInTheDocument()
    })

    it('should have proper menu roles', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      const profileButton = screen.getByLabelText('User menu')
      await user.click(profileButton)
      
      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()
      
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(2) // Profile Settings and Logout
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByLabelText('Search')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText('Submit search')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText('Notifications')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText('User menu')).toHaveFocus()
    })

    it('should handle keyboard interaction for profile menu', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      const profileButton = screen.getByLabelText('User menu')
      
      // Open menu with Enter
      profileButton.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('menu')).toBeInTheDocument()
      
      // Close menu with Escape
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  describe('responsive behavior', () => {
    it('should handle long user names gracefully', () => {
      const userWithLongName = {
        ...mockUser,
        name: 'Very Long User Name That Might Overflow'
      }
      render(<Header {...defaultProps} user={userWithLongName} />)
      
      expect(screen.getByText('Very Long User Name That Might Overflow')).toBeInTheDocument()
    })

    it('should handle missing user properties', () => {
      const incompleteUser = {
        id: 'user-123',
        name: 'John',
        email: '',
        role: ''
      }
      render(<Header {...defaultProps} user={incompleteUser} />)
      
      expect(screen.getByText('John')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined callback functions', async () => {
      const user = userEvent.setup()
      render(<Header user={mockUser} />)
      
      // Should not throw errors when callbacks are undefined
      const searchButton = screen.getByLabelText('Submit search')
      await user.click(searchButton)
      
      const notificationButton = screen.getByLabelText('Notifications')
      await user.click(notificationButton)
      
      const profileButton = screen.getByLabelText('User menu')
      await user.click(profileButton)
      
      const profileMenuItem = screen.getByText('Profile Settings')
      await user.click(profileMenuItem)
    })

    it('should handle rapid clicks on profile menu', async () => {
      const user = userEvent.setup()
      render(<Header {...defaultProps} />)
      
      const profileButton = screen.getByLabelText('User menu')
      
      // Rapid clicks should not cause issues
      await user.click(profileButton)
      await user.click(profileButton)
      await user.click(profileButton)
      
      // Menu should be closed after odd number of clicks
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should handle special characters in search', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(<Header {...defaultProps} onSearch={onSearch} />)
      
      const searchInput = screen.getByLabelText('Search')
      const specialQuery = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      
      await user.type(searchInput, specialQuery)
      await user.keyboard('{Enter}')
      
      expect(onSearch).toHaveBeenCalledWith(specialQuery)
    })

    it('should handle very large notification counts', () => {
      render(<Header {...defaultProps} notificationCount={999999} />)
      
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete user workflow', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      const onNotificationClick = vi.fn()
      const onProfileClick = vi.fn()
      const onLogout = vi.fn()
      
      render(
        <Header
          {...defaultProps}
          onSearch={onSearch}
          onNotificationClick={onNotificationClick}
          onProfileClick={onProfileClick}
          onLogout={onLogout}
          notificationCount={5}
        />
      )
      
      // Search for something
      const searchInput = screen.getByLabelText('Search')
      await user.type(searchInput, 'test search')
      await user.keyboard('{Enter}')
      expect(onSearch).toHaveBeenCalledWith('test search')
      
      // Check notifications
      const notificationButton = screen.getByLabelText('Notifications (5 unread)')
      await user.click(notificationButton)
      expect(onNotificationClick).toHaveBeenCalledOnce()
      
      // Open profile menu and go to profile
      const profileButton = screen.getByLabelText('User menu')
      await user.click(profileButton)
      
      const profileMenuItem = screen.getByText('Profile Settings')
      await user.click(profileMenuItem)
      expect(onProfileClick).toHaveBeenCalledOnce()
      
      // Open profile menu again and logout
      await user.click(profileButton)
      const logoutMenuItem = screen.getByText('Logout')
      await user.click(logoutMenuItem)
      expect(onLogout).toHaveBeenCalledOnce()
    })
  })
})