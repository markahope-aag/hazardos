import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerSearch from '@/components/customers/CustomerSearch'

describe('CustomerSearch Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render search input with placeholder', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    const input = screen.getByPlaceholderText(/search customers/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should display current search value', () => {
    render(<CustomerSearch value="John Doe" onChange={vi.fn()} />)

    const input = screen.getByDisplayValue('John Doe')
    expect(input).toBeInTheDocument()
  })

  it('should call onChange with debounce when user types', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const handleChange = vi.fn()

    render(<CustomerSearch value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText(/search customers/i)

    await user.type(input, 't')

    // Fast-forward past debounce delay
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    expect(handleChange).toHaveBeenCalledWith('t')
  })

  it('should show clear button when value is not empty', async () => {
    render(<CustomerSearch value="search term" onChange={vi.fn()} />)

    // The button has sr-only text "Clear search"
    const clearButton = screen.getByRole('button')
    expect(clearButton).toBeInTheDocument()
  })

  it('should not show clear button when value is empty', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    const clearButton = screen.queryByRole('button')
    expect(clearButton).not.toBeInTheDocument()
  })

  it('should clear search when clear button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const handleChange = vi.fn()

    render(<CustomerSearch value="search term" onChange={handleChange} />)

    const clearButton = screen.getByRole('button')
    await user.click(clearButton)

    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('should have search icon', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    // The Search icon from lucide-react renders as an SVG
    const container = screen.getByPlaceholderText(/search customers/i).parentElement
    const svg = container?.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should render with custom placeholder', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} placeholder="Find customers..." />)

    const input = screen.getByPlaceholderText('Find customers...')
    expect(input).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} className="custom-class" />)

    const container = screen.getByPlaceholderText(/search customers/i).parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should have relative positioning for icon overlay', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    const container = screen.getByPlaceholderText(/search customers/i).parentElement
    expect(container).toHaveClass('relative')
  })

  it('should debounce rapid input changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const handleChange = vi.fn()

    render(<CustomerSearch value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText(/search customers/i)

    // Type quickly
    await user.type(input, 'quick')

    // Before debounce, onChange should not be called with full value
    expect(handleChange).not.toHaveBeenCalledWith('quick')

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    // Now it should be called
    expect(handleChange).toHaveBeenCalledWith('quick')
  })

  it('should update local value when prop changes', async () => {
    const { rerender } = render(<CustomerSearch value="initial" onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

    rerender(<CustomerSearch value="updated" onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
  })
})
