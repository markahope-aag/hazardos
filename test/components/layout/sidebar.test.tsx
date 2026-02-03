import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock sidebar component
interface NavigationItem {
  id: string
  label: string
  icon?: string
  href?: string
  onClick?: () => void
  badge?: number
  children?: NavigationItem[]
  disabled?: boolean
}

interface SidebarProps {
  items: NavigationItem[]
  activeItemId?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  onItemClick?: (item: NavigationItem) => void
  className?: string
  showToggle?: boolean
}

const Sidebar = ({
  items,
  activeItemId,
  collapsed = false,
  onToggleCollapse,
  onItemClick,
  className = '',
  showToggle = true
}: SidebarProps) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleItemClick = (item: NavigationItem, e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault()
      return
    }

    if (item.children && item.children.length > 0) {
      e.preventDefault()
      toggleExpanded(item.id)
    } else {
      onItemClick?.(item)
      item.onClick?.()
    }
  }

  const renderItem = (item: NavigationItem, level: number = 0): React.ReactNode => {
    const isActive = activeItemId === item.id
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0
    const _isParentLevel = level === 0

    return (
      <li key={item.id} className={`nav-item level-${level}`}>
        <a
          href={item.href || '#'}
          className={`nav-link ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
          onClick={(e) => handleItemClick(item, e)}
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-disabled={item.disabled}
          style={{ paddingLeft: `${level * 16 + 16}px` }}
        >
          {item.icon && (
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          
          {!collapsed && (
            <>
              <span className="nav-label">{item.label}</span>
              
              {item.badge && item.badge > 0 && (
                <span className="nav-badge" aria-label={`${item.badge} items`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              
              {hasChildren && (
                <span className="nav-arrow" aria-hidden="true">
                  {isExpanded ? '▼' : '▶'}
                </span>
              )}
            </>
          )}
        </a>

        {hasChildren && isExpanded && !collapsed && (
          <ul className="nav-submenu" role="group">
            {item.children!.map(child => renderItem(child, level + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <aside 
      className={`sidebar ${collapsed ? 'collapsed' : 'expanded'} ${className}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {showToggle && (
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      )}

      <nav className="sidebar-nav">
        <ul className="nav-list" role="menubar">
          {items.map(item => renderItem(item))}
        </ul>
      </nav>
    </aside>
  )
}

describe('Sidebar', () => {
  const mockItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      href: '/dashboard'
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: '🔧',
      href: '/jobs',
      badge: 5
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👥',
      children: [
        {
          id: 'customers-list',
          label: 'All Customers',
          href: '/customers'
        },
        {
          id: 'customers-new',
          label: 'Add Customer',
          href: '/customers/new'
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📈',
      href: '/reports',
      disabled: true
    }
  ]

  const defaultProps = {
    items: mockItems,
    onToggleCollapse: vi.fn(),
    onItemClick: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render sidebar with navigation items', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
      expect(screen.getByRole('menubar')).toBeInTheDocument()
    })

    it('should render all navigation items', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Jobs')).toBeInTheDocument()
      expect(screen.getByText('Customers')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
    })

    it('should render icons when provided', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('📊')).toBeInTheDocument()
      expect(screen.getByText('🔧')).toBeInTheDocument()
      expect(screen.getByText('👥')).toBeInTheDocument()
      expect(screen.getByText('📈')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<Sidebar {...defaultProps} className="custom-sidebar" />)
      
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toHaveClass('custom-sidebar')
    })
  })

  describe('collapse/expand functionality', () => {
    it('should render toggle button by default', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
    })

    it('should not render toggle button when showToggle is false', () => {
      render(<Sidebar {...defaultProps} showToggle={false} />)
      
      expect(screen.queryByLabelText(/sidebar/)).not.toBeInTheDocument()
    })

    it('should show expanded state by default', () => {
      render(<Sidebar {...defaultProps} />)
      
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toHaveClass('expanded')
      expect(sidebar).not.toHaveClass('collapsed')
      
      const toggleButton = screen.getByLabelText('Collapse sidebar')
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should show collapsed state when collapsed prop is true', () => {
      render(<Sidebar {...defaultProps} collapsed={true} />)
      
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toHaveClass('collapsed')
      expect(sidebar).not.toHaveClass('expanded')
      
      const toggleButton = screen.getByLabelText('Expand sidebar')
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should call onToggleCollapse when toggle button is clicked', async () => {
      const user = userEvent.setup()
      const onToggleCollapse = vi.fn()
      render(<Sidebar {...defaultProps} onToggleCollapse={onToggleCollapse} />)
      
      const toggleButton = screen.getByLabelText('Collapse sidebar')
      await user.click(toggleButton)
      
      expect(onToggleCollapse).toHaveBeenCalledOnce()
    })

    it('should hide labels and badges when collapsed', () => {
      render(<Sidebar {...defaultProps} collapsed={true} />)
      
      // Labels should not be visible
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Jobs')).not.toBeInTheDocument()
      
      // Icons should still be visible
      expect(screen.getByText('📊')).toBeInTheDocument()
      expect(screen.getByText('🔧')).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('should highlight active item', () => {
      render(<Sidebar {...defaultProps} activeItemId="dashboard" />)
      
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('active')
      expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    })

    it('should not highlight non-active items', () => {
      render(<Sidebar {...defaultProps} activeItemId="dashboard" />)
      
      const jobsLink = screen.getByText('Jobs').closest('a')
      expect(jobsLink).not.toHaveClass('active')
      expect(jobsLink).not.toHaveAttribute('aria-current')
    })
  })

  describe('badges', () => {
    it('should display badge when provided', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByLabelText('5 items')).toBeInTheDocument()
    })

    it('should display 99+ for badges over 99', () => {
      const itemsWithLargeBadge = [
        {
          id: 'notifications',
          label: 'Notifications',
          badge: 150
        }
      ]
      render(<Sidebar items={itemsWithLargeBadge} />)
      
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should not display badge for zero or undefined', () => {
      const itemsWithoutBadge = [
        {
          id: 'dashboard',
          label: 'Dashboard',
          badge: 0
        }
      ]
      render(<Sidebar items={itemsWithoutBadge} />)
      
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  describe('nested navigation', () => {
    it('should render parent items with arrow indicators', () => {
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')
      expect(customersLink).toBeInTheDocument()
      expect(screen.getByText('▶')).toBeInTheDocument() // Collapsed arrow
    })

    it('should not show children initially', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.queryByText('All Customers')).not.toBeInTheDocument()
      expect(screen.queryByText('Add Customer')).not.toBeInTheDocument()
    })

    it('should expand children when parent is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      await user.click(customersLink)
      
      expect(screen.getByText('All Customers')).toBeInTheDocument()
      expect(screen.getByText('Add Customer')).toBeInTheDocument()
      expect(screen.getByText('▼')).toBeInTheDocument() // Expanded arrow
    })

    it('should collapse children when parent is clicked again', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      
      // Expand
      await user.click(customersLink)
      expect(screen.getByText('All Customers')).toBeInTheDocument()
      
      // Collapse
      await user.click(customersLink)
      expect(screen.queryByText('All Customers')).not.toBeInTheDocument()
    })

    it('should set proper aria-expanded attribute', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      
      expect(customersLink).toHaveAttribute('aria-expanded', 'false')
      
      await user.click(customersLink)
      expect(customersLink).toHaveAttribute('aria-expanded', 'true')
    })

    it('should render submenu with proper role', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      await user.click(customersLink)
      
      const submenu = screen.getByRole('group')
      expect(submenu).toHaveClass('nav-submenu')
    })

    it('should indent child items', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      await user.click(customersLink)
      
      const childLink = screen.getByText('All Customers').closest('a')!
      expect(childLink).toHaveStyle({ paddingLeft: '32px' }) // 16px base + 16px indent
    })
  })

  describe('disabled items', () => {
    it('should render disabled items with proper styling', () => {
      render(<Sidebar {...defaultProps} />)
      
      const reportsLink = screen.getByText('Reports').closest('a')
      expect(reportsLink).toHaveClass('disabled')
      expect(reportsLink).toHaveAttribute('aria-disabled', 'true')
    })

    it('should not call onClick for disabled items', async () => {
      const user = userEvent.setup()
      const onItemClick = vi.fn()
      render(<Sidebar {...defaultProps} onItemClick={onItemClick} />)
      
      const reportsLink = screen.getByText('Reports').closest('a')!
      await user.click(reportsLink)
      
      expect(onItemClick).not.toHaveBeenCalled()
    })
  })

  describe('click handling', () => {
    it('should call onItemClick for regular items', async () => {
      const user = userEvent.setup()
      const onItemClick = vi.fn()
      render(<Sidebar {...defaultProps} onItemClick={onItemClick} />)
      
      const dashboardLink = screen.getByText('Dashboard').closest('a')!
      await user.click(dashboardLink)
      
      expect(onItemClick).toHaveBeenCalledWith(mockItems[0])
    })

    it('should call item onClick if provided', async () => {
      const user = userEvent.setup()
      const itemOnClick = vi.fn()
      const itemsWithOnClick = [
        {
          id: 'custom',
          label: 'Custom Item',
          onClick: itemOnClick
        }
      ]
      render(<Sidebar items={itemsWithOnClick} />)
      
      const customLink = screen.getByText('Custom Item').closest('a')!
      await user.click(customLink)
      
      expect(itemOnClick).toHaveBeenCalledOnce()
    })

    it('should call both onItemClick and item onClick', async () => {
      const user = userEvent.setup()
      const onItemClick = vi.fn()
      const itemOnClick = vi.fn()
      const itemsWithOnClick = [
        {
          id: 'custom',
          label: 'Custom Item',
          onClick: itemOnClick
        }
      ]
      render(<Sidebar items={itemsWithOnClick} onItemClick={onItemClick} />)
      
      const customLink = screen.getByText('Custom Item').closest('a')!
      await user.click(customLink)
      
      expect(onItemClick).toHaveBeenCalledWith(itemsWithOnClick[0])
      expect(itemOnClick).toHaveBeenCalledOnce()
    })

    it('should not call onItemClick for parent items with children', async () => {
      const user = userEvent.setup()
      const onItemClick = vi.fn()
      render(<Sidebar {...defaultProps} onItemClick={onItemClick} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      await user.click(customersLink)
      
      expect(onItemClick).not.toHaveBeenCalled()
    })

    it('should call onItemClick for child items', async () => {
      const user = userEvent.setup()
      const onItemClick = vi.fn()
      render(<Sidebar {...defaultProps} onItemClick={onItemClick} />)
      
      // First expand the parent
      const customersLink = screen.getByText('Customers').closest('a')!
      await user.click(customersLink)
      
      // Then click child
      const childLink = screen.getByText('All Customers').closest('a')!
      await user.click(childLink)
      
      expect(onItemClick).toHaveBeenCalledWith(mockItems[2].children![0])
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation')
      expect(screen.getByRole('menubar')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // Tab through navigation items
      await user.tab()
      expect(screen.getByLabelText('Collapse sidebar')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Dashboard').closest('a')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Jobs').closest('a')).toHaveFocus()
    })

    it('should handle Enter key for expanding items', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      customersLink.focus()
      
      await user.keyboard('{Enter}')
      
      expect(screen.getByText('All Customers')).toBeInTheDocument()
    })

    it('should handle Space key for expanding items', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      customersLink.focus()
      
      await user.keyboard(' ')
      
      expect(screen.getByText('All Customers')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      render(<Sidebar items={[]} />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('menubar')).toBeInTheDocument()
    })

    it('should handle items without icons', () => {
      const itemsWithoutIcons = [
        {
          id: 'no-icon',
          label: 'No Icon Item'
        }
      ]
      render(<Sidebar items={itemsWithoutIcons} />)
      
      expect(screen.getByText('No Icon Item')).toBeInTheDocument()
    })

    it('should handle deeply nested items', async () => {
      const user = userEvent.setup()
      const deeplyNestedItems = [
        {
          id: 'level1',
          label: 'Level 1',
          children: [
            {
              id: 'level2',
              label: 'Level 2',
              children: [
                {
                  id: 'level3',
                  label: 'Level 3'
                }
              ]
            }
          ]
        }
      ]
      render(<Sidebar items={deeplyNestedItems} />)
      
      // Expand level 1
      const level1Link = screen.getByText('Level 1').closest('a')!
      await user.click(level1Link)
      expect(screen.getByText('Level 2')).toBeInTheDocument()
      
      // Expand level 2
      const level2Link = screen.getByText('Level 2').closest('a')!
      await user.click(level2Link)
      expect(screen.getByText('Level 3')).toBeInTheDocument()
      
      // Check indentation
      const level3Link = screen.getByText('Level 3').closest('a')!
      expect(level3Link).toHaveStyle({ paddingLeft: '48px' }) // 16 + 16 + 16
    })

    it('should handle undefined callback functions', async () => {
      const user = userEvent.setup()
      render(<Sidebar items={mockItems} />)
      
      // Should not throw errors when callbacks are undefined
      const toggleButton = screen.getByLabelText('Collapse sidebar')
      await user.click(toggleButton)
      
      const dashboardLink = screen.getByText('Dashboard').closest('a')!
      await user.click(dashboardLink)
    })

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const customersLink = screen.getByText('Customers').closest('a')!
      
      // Rapid clicks should not cause issues
      await user.click(customersLink)
      await user.click(customersLink)
      await user.click(customersLink)
      
      // Should end up collapsed after odd number of clicks
      expect(screen.queryByText('All Customers')).not.toBeInTheDocument()
    })
  })

  describe('responsive behavior', () => {
    it('should handle long item labels', () => {
      const itemsWithLongLabels = [
        {
          id: 'long',
          label: 'This is a very long navigation item label that might overflow'
        }
      ]
      render(<Sidebar items={itemsWithLongLabels} />)
      
      expect(screen.getByText('This is a very long navigation item label that might overflow')).toBeInTheDocument()
    })

    it('should maintain state when items change', () => {
      const { rerender } = render(<Sidebar {...defaultProps} />)
      
      // Initially collapsed
      expect(screen.getByRole('navigation')).toHaveClass('expanded')
      
      // Re-render with collapsed prop
      rerender(<Sidebar {...defaultProps} collapsed={true} />)
      
      expect(screen.getByRole('navigation')).toHaveClass('collapsed')
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete navigation workflow', async () => {
      const user = userEvent.setup()
      const onToggleCollapse = vi.fn()
      const onItemClick = vi.fn()
      
      render(
        <Sidebar
          {...defaultProps}
          onToggleCollapse={onToggleCollapse}
          onItemClick={onItemClick}
          activeItemId="dashboard"
        />
      )
      
      // Verify active state
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('active')
      
      // Expand submenu
      const customersLink = screen.getByText('Customers').closest('a')!
      await user.click(customersLink)
      expect(screen.getByText('All Customers')).toBeInTheDocument()
      
      // Click child item
      const childLink = screen.getByText('All Customers').closest('a')!
      await user.click(childLink)
      expect(onItemClick).toHaveBeenCalledWith(mockItems[2].children![0])
      
      // Toggle sidebar
      const toggleButton = screen.getByLabelText('Collapse sidebar')
      await user.click(toggleButton)
      expect(onToggleCollapse).toHaveBeenCalledOnce()
    })
  })
})