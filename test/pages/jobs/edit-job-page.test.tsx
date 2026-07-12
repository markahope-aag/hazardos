import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Suspense } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EditJobPage from '@/app/(dashboard)/jobs/[id]/edit/page'

/**
 * J3: editing a job without touching the scheduled time failed with
 * "scheduled_start_time: Invalid string: must match pattern ^\d{2}:\d{2}$".
 *
 * Postgres TIME columns round-trip through the API as "HH:MM:SS". The edit
 * form hydrated its scheduled_start_time field directly from that value
 * with no slicing, so an unedited time field sent "14:30:00" in the PATCH
 * body — failing updateJobSchema's ^\d{2}:\d{2}$ regex on the server.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'PPP') return 'January 1, 2026'
    if (formatStr === 'yyyy-MM-dd') return '2026-01-01'
    return date.toISOString()
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  }),
}))

const mockJob = {
  id: 'job-1',
  job_number: 'JOB-100-1012026',
  name: 'Test Job',
  assigned_to: 'tech-1',
  customer_id: 'cust-1',
  site_survey_id: null,
  scheduled_start_date: '2026-01-15',
  // Round-tripped from a Postgres TIME column — includes seconds.
  scheduled_start_time: '14:30:00',
  scheduled_end_date: null,
  estimated_duration_hours: null,
  job_address: '123 Main St',
  job_city: '',
  job_state: '',
  job_zip: '',
  gate_code: '',
  lockbox_code: '',
  contact_onsite_name: '',
  contact_onsite_phone: '',
  access_notes: '',
  special_instructions: '',
  internal_notes: '',
}

const mockFetch = vi.fn()
global.fetch = mockFetch

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <EditJobPage params={Promise.resolve({ id: 'job-1' })} />
      </Suspense>
    </QueryClientProvider>
  )
}

describe('EditJobPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/jobs/job-1') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockJob) })
      }
      if (url === '/api/team') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ members: [{ id: 'tech-1', first_name: 'Tech', last_name: 'One', role: 'technician' }] }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  it('sends scheduled_start_time as HH:MM (not HH:MM:SS) when unchanged', async () => {
    const user = userEvent.setup()
    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Job')).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/jobs/job-1' && call[1]?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      const body = JSON.parse(patchCall![1].body)
      expect(body.scheduled_start_time).toBe('14:30')
    })
  })
})
