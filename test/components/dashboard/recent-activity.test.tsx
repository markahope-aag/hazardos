import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentActivity } from '@/components/dashboard/recent-activity'

// Mock the Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date: Date, options?: { addSuffix?: boolean }) => {
    const diff = Date.now() - date.getTime()
    if (diff < 60000) return options?.addSuffix ? 'a few seconds ago' : 'a few seconds'
    if (diff < 3600000) return options?.addSuffix ? '5 minutes ago' : '5 minutes'
    if (diff < 86400000) return options?.addSuffix ? '2 hours ago' : '2 hours'
    return options?.addSuffix ? '1 day ago' : '1 day'
  }),
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }: any) => (
    <div data-testid="avatar" className={className} {...props}>{children}</div>
  ),
  AvatarFallback: ({ children, className, ...props }: any) => (
    <div data-testid="avatar-fallback" className={className} {...props}>{children}</div>
  ),
}))

describe('RecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset the mock chain for each test
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
  })

  it('should render recent activity card with title', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await RecentActivity())

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('should display "No recent activity" when no activities exist', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await RecentActivity())

    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('should render activity entries with user information', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'ABC Corp',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        user_name: 'Jane Smith',
        action: 'updated',
        entity_type: 'Job',
        entity_name: 'Asbestos Survey',
        created_at: '2024-01-15T09:30:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    // Check that activities are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    // Entity names are wrapped in quotes in the component
    expect(screen.getByText((content, _element) => content.includes('ABC Corp'))).toBeInTheDocument()
    expect(screen.getByText((content, _element) => content.includes('Asbestos Survey'))).toBeInTheDocument()
  })

  it('should display correct action icons', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'ABC Corp',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        user_name: 'Jane Smith',
        action: 'updated',
        entity_type: 'Job',
        entity_name: null,
        created_at: '2024-01-15T09:30:00Z',
      },
      {
        id: '3',
        user_name: 'Bob Wilson',
        action: 'unknown_action',
        entity_type: 'Invoice',
        entity_name: 'INV-001',
        created_at: '2024-01-15T09:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    // Check action icons
    expect(screen.getByText('+ created')).toBeInTheDocument()
    expect(screen.getByText('~ updated')).toBeInTheDocument()
    expect(screen.getByText('* unknown_action')).toBeInTheDocument()
  })

  it('should handle null user names by showing "System"', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: null,
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'ABC Corp',
        created_at: '2024-01-15T10:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('should handle null entity names gracefully', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'Customer',
        entity_name: null,
        created_at: '2024-01-15T10:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    // Should not show entity name when null
    expect(screen.queryByText('"')).not.toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('should generate correct user initials for avatar fallback', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'ABC Corp',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        user_name: 'Jane Mary Smith',
        action: 'updated',
        entity_type: 'Job',
        entity_name: 'Test Job',
        created_at: '2024-01-15T09:30:00Z',
      },
      {
        id: '3',
        user_name: null,
        action: 'deleted',
        entity_type: 'Invoice',
        entity_name: 'INV-001',
        created_at: '2024-01-15T09:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    const avatarFallbacks = screen.getAllByTestId('avatar-fallback')
    
    // John Doe -> JD
    expect(avatarFallbacks[0]).toHaveTextContent('JD')
    // Jane Mary Smith -> JMS
    expect(avatarFallbacks[1]).toHaveTextContent('JMS')
    // null user -> ?
    expect(avatarFallbacks[2]).toHaveTextContent('?')
  })

  it('should display relative timestamps', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'John Doe',
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'ABC Corp',
        created_at: '2024-01-15T10:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    // Should show relative time (mocked to return based on diff calculation)
    // The mock returns different values based on time difference
    expect(screen.getByText(/ago$/)).toBeInTheDocument()
  })

  it('should query activity log with correct parameters', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await RecentActivity())

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('activity_log')
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(
      'id, user_name, action, entity_type, entity_name, created_at'
    )
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(8)
  })

  it('should handle all predefined action icons', async () => {
    const mockActivities = [
      { id: '1', user_name: 'User', action: 'created', entity_type: 'Customer', entity_name: 'Test', created_at: '2024-01-15T10:00:00Z' },
      { id: '2', user_name: 'User', action: 'updated', entity_type: 'Job', entity_name: 'Test', created_at: '2024-01-15T09:30:00Z' },
      { id: '3', user_name: 'User', action: 'deleted', entity_type: 'Invoice', entity_name: 'Test', created_at: '2024-01-15T09:00:00Z' },
      { id: '4', user_name: 'User', action: 'status_changed', entity_type: 'Job', entity_name: 'Test', created_at: '2024-01-15T08:30:00Z' },
      { id: '5', user_name: 'User', action: 'signed', entity_type: 'Proposal', entity_name: 'Test', created_at: '2024-01-15T08:00:00Z' },
      { id: '6', user_name: 'User', action: 'paid', entity_type: 'Invoice', entity_name: 'Test', created_at: '2024-01-15T07:30:00Z' },
      { id: '7', user_name: 'User', action: 'sent', entity_type: 'Email', entity_name: 'Test', created_at: '2024-01-15T07:00:00Z' },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    expect(screen.getByText('+ created')).toBeInTheDocument()
    expect(screen.getByText('~ updated')).toBeInTheDocument()
    expect(screen.getByText('- deleted')).toBeInTheDocument()
    expect(screen.getByText('* status_changed')).toBeInTheDocument()
    expect(screen.getByText('S signed')).toBeInTheDocument()
    expect(screen.getByText('$ paid')).toBeInTheDocument()
    expect(screen.getByText('> sent')).toBeInTheDocument()
  })

  it('should handle null data response gracefully', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: null,
    })

    render(await RecentActivity())

    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('should apply correct CSS classes', async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
    })

    render(await RecentActivity())

    const cardTitle = screen.getByTestId('card-title')
    expect(cardTitle).toHaveClass('text-lg')
  })

  it('should handle activity entries with special characters in names', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'José María',
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'Smith & Co. "Special" Ltd.',
        created_at: '2024-01-15T10:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    expect(screen.getByText('José María')).toBeInTheDocument()
    // Entity name is wrapped in quotes, so use flexible matcher
    expect(screen.getByText(content => content.includes('Smith & Co. "Special" Ltd.'))).toBeInTheDocument()
  })

  it('should handle single character names for initials', async () => {
    const mockActivities = [
      {
        id: '1',
        user_name: 'A',
        action: 'created',
        entity_type: 'Customer',
        entity_name: 'Test',
        created_at: '2024-01-15T10:00:00Z',
      },
    ]

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockActivities,
    })

    render(await RecentActivity())

    const avatarFallback = screen.getByTestId('avatar-fallback')
    expect(avatarFallback).toHaveTextContent('A')
  })
})