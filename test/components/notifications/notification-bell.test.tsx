import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationBell } from '@/components/notifications/notification-bell'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock notification types
vi.mock('@/types/notifications', () => ({
  NotificationType: {
    JOB_ASSIGNED: 'job_assigned',
    JOB_COMPLETED: 'job_completed',
    PROPOSAL_SIGNED: 'proposal_signed',
    INVOICE_PAID: 'invoice_paid',
    SYSTEM: 'system',
  },
}))

const mockNotifications = [
  {
    id: '1',
    title: 'New job assigned',
    message: 'Job #123 has been assigned to you',
    type: 'job_assigned',
    is_read: false,
    action_url: '/jobs/123',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Invoice paid',
    message: 'Invoice #456 has been paid',
    type: 'invoice_paid',
    is_read: true,
    action_url: '/invoices/456',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: '3',
    title: 'System maintenance',
    message: 'Scheduled maintenance tonight',
    type: 'system',
    is_read: false,
    action_url: null,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
]

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render notification bell button', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })
  })

  it('should show unread count badge', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('should show bell ring icon when there are unread notifications', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications.*2 unread/i })
      expect(button).toBeInTheDocument()
    })
  })

  it('should show regular bell icon when no unread notifications', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Notifications' })
      expect(button).toBeInTheDocument()
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  it('should open popover when bell is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('should display notifications in popover', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    expect(screen.getByText('New job assigned')).toBeInTheDocument()
    expect(screen.getByText('Invoice paid')).toBeInTheDocument()
    expect(screen.getByText('System maintenance')).toBeInTheDocument()
  })

  it('should show loading state while fetching', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<NotificationBell />)
    
    const button = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(button)

    expect(screen.getByRole('generic', { name: '' })).toHaveClass('animate-spin')
  })

  it('should show empty state when no notifications', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('should show mark all read button when there are unread notifications', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
  })

  it('should mark single notification as read when clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    const notification = screen.getByRole('button', { name: /new job assigned/i })
    fireEvent.click(notification)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/1/read', {
        method: 'POST',
      })
    })
  })

  it('should navigate when notification with action URL is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    const notification = screen.getByRole('button', { name: /new job assigned/i })
    fireEvent.click(notification)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/jobs/123')
    })
  })

  it('should mark all notifications as read', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    const markAllButton = screen.getByRole('button', { name: /mark all read/i })
    fireEvent.click(markAllButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/read-all', {
        method: 'POST',
      })
    })
  })

  it('should show loading state when marking notification as read', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })
      .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    const notification = screen.getByRole('button', { name: /new job assigned/i })
    fireEvent.click(notification)

    await waitFor(() => {
      expect(notification.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('should poll for notifications at regular intervals', async () => {
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => ({ count: 0 }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      })

    render(<NotificationBell />)
    
    // Initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    // Advance timer by 30 seconds
    vi.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4) // 2 more calls
    })
  })

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<NotificationBell />)
    
    // Should not crash and should show empty state
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('should navigate to all notifications page', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    const viewAllButton = screen.getByRole('button', { name: /view all notifications/i })
    fireEvent.click(viewAllButton)

    expect(mockPush).toHaveBeenCalledWith('/notifications')
  })

  it('should format time ago correctly', async () => {
    const recentNotification = {
      ...mockNotifications[0],
      created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [recentNotification],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    expect(screen.getByText('2m ago')).toBeInTheDocument()
  })

  it('should show unread indicator for unread notifications', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    // Unread notifications should have blue dot indicators
    const unreadDots = document.querySelectorAll('.bg-blue-500.rounded-full')
    expect(unreadDots).toHaveLength(2) // Two unread notifications
  })

  it('should handle notifications without action URLs', async () => {
    const notificationNoAction = {
      ...mockNotifications[2],
      action_url: null,
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [notificationNoAction],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    render(<NotificationBell />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /notifications/i })
      fireEvent.click(button)
    })

    const notification = screen.getByRole('button', { name: /system maintenance/i })
    fireEvent.click(notification)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/3/read', {
        method: 'POST',
      })
    })

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled()
  })
})