import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Suspense, type ReactElement } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import MessageThreadPage from '@/app/(dashboard)/messages/[customerId]/page'

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

async function renderThread(ui: ReactElement) {
  await act(async () => {
    render(<Suspense fallback={null}>{ui}</Suspense>)
  })
}

describe('MessageThreadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads customer and shows empty thread', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/customers/cust-42')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              customer: {
                id: 'cust-42',
                name: 'Alex Rivera',
                company_name: null,
                phone: null,
                mobile_phone: '555-2020',
                sms_opt_in: true,
              },
            }),
        })
      }
      if (url.includes('/api/sms/messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ messages: [] }),
        })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })

    await renderThread(<MessageThreadPage params={Promise.resolve({ customerId: 'cust-42' })} />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Alex Rivera' })).toBeInTheDocument()
    })
    expect(screen.getByText('No messages yet.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a reply…')).toBeInTheDocument()
  })

  it('shows error when customer cannot be loaded', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/customers/bad-id')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      })
    })

    await renderThread(<MessageThreadPage params={Promise.resolve({ customerId: 'bad-id' })} />)

    await waitFor(() => {
      expect(screen.getByText('Customer not found')).toBeInTheDocument()
    })
  })
})
