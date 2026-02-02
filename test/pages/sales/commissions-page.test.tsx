import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Mock CommissionService - must return arrays not undefined
vi.mock('@/lib/services/commission-service', () => ({
  CommissionService: {
    getSummary: () => Promise.resolve({
      total_pending: 2500,
      total_approved: 5000,
      this_month: 1500,
      total_paid: 15000,
    }),
    getEarnings: () => Promise.resolve({
      earnings: [
        {
          id: 'earning-1',
          earning_date: '2024-01-15',
          user: { full_name: 'John Doe' },
          plan: { name: 'Standard Plan' },
          base_amount: 10000,
          commission_rate: 10,
          commission_amount: 1000,
          status: 'pending',
        },
        {
          id: 'earning-2',
          earning_date: '2024-01-14',
          user: { full_name: 'Jane Smith' },
          plan: { name: 'Premium Plan' },
          base_amount: 20000,
          commission_rate: 15,
          commission_amount: 3000,
          status: 'paid',
        },
      ],
    }),
  },
}))

// Import after mocks
import CommissionsPage from '@/app/(dashboard)/sales/commissions/page'

describe('CommissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await CommissionsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('Commission Tracking')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('Track and manage sales commissions')).toBeInTheDocument()
  })

  it('displays pending amount card', async () => {
    const page = await CommissionsPage()
    render(page)

    const pendingCard = screen.getByText('Pending')
    expect(pendingCard).toBeInTheDocument()
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument()
  })

  it('displays approved amount card', async () => {
    const page = await CommissionsPage()
    render(page)

    const approvedCard = screen.getByText('Approved')
    expect(approvedCard).toBeInTheDocument()
    expect(screen.getByText('Ready for payment')).toBeInTheDocument()
  })

  it('displays this month amount card', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('This Month')).toBeInTheDocument()
    expect(screen.getByText('Earned this month')).toBeInTheDocument()
  })

  it('displays paid YTD card', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('Paid YTD')).toBeInTheDocument()
    expect(screen.getByText('Total paid out')).toBeInTheDocument()
  })

  it('displays commission earnings table', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('Commission Earnings')).toBeInTheDocument()
  })

  it('displays earnings data', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Standard Plan')).toBeInTheDocument()
    expect(screen.getByText('Premium Plan')).toBeInTheDocument()
  })

  it('displays commission rates', async () => {
    const page = await CommissionsPage()
    render(page)

    expect(screen.getByText('10%')).toBeInTheDocument()
    expect(screen.getByText('15%')).toBeInTheDocument()
  })
})
