import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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

  it('should call onChange when user types (after debounce)', async () => {
    const handleChange = vi.fn()

    render(<CustomerSearch value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText(/search customers/i)

    // Type directly into the input
    await act(async () => {
      // Simulate input change
      input.focus()
      await userEvent.type(input, 'test search', { delay: null })
    })

    // Advance past the 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(handleChange).toHaveBeenCalledWith('test search')
  })

  it('should show clear button when value is not empty', () => {
    render(<CustomerSearch value="search term" onChange={vi.fn()} />)

    const clearButton = screen.getByRole('button', { name: /clear search/i })
    expect(clearButton).toBeInTheDocument()
  })

  it('should not show clear button when value is empty', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    const clearButton = screen.queryByRole('button', { name: /clear search/i })
    expect(clearButton).not.toBeInTheDocument()
  })

  it('should clear search when clear button is clicked', async () => {
    const handleChange = vi.fn()

    render(<CustomerSearch value="search term" onChange={handleChange} />)

    const clearButton = screen.getByRole('button', { name: /clear search/i })

    await act(async () => {
      await userEvent.click(clearButton)
    })

    // Clear is called immediately, not debounced
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('should have search icon', () => {
    const { container } = render(<CustomerSearch value="" onChange={vi.fn()} />)

    // Check for Lucide Search icon SVG with the search class
    const searchIcon = container.querySelector('svg.lucide-search')
    expect(searchIcon).toBeInTheDocument()
  })

  it('should be accessible with proper placeholder', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    // Input uses placeholder for accessibility - no explicit label
    const input = screen.getByPlaceholderText(/search customers/i)
    expect(input).toBeInTheDocument()
  })

  it('should handle focus and blur events', async () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)

    const input = screen.getByPlaceholderText(/search customers/i)

    await act(async () => {
      input.focus()
    })
    expect(input).toHaveFocus()

    await act(async () => {
      input.blur()
    })
    expect(input).not.toHaveFocus()
  })

  it('should debounce search input changes', async () => {
    const handleChange = vi.fn()

    render(<CustomerSearch value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText(/search customers/i)

    // Type quickly - should debounce
    await act(async () => {
      input.focus()
      await userEvent.type(input, 'quick', { delay: null })
    })

    // Before debounce timer fires, onChange should not be called with final value
    expect(handleChange).not.toHaveBeenCalledWith('quick')

    // After debounce, should be called
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(handleChange).toHaveBeenCalledWith('quick')
  })

  it('should accept custom placeholder', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} placeholder="Find contacts..." />)

    const input = screen.getByPlaceholderText('Find contacts...')
    expect(input).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(<CustomerSearch value="" onChange={vi.fn()} className="custom-class" />)

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('custom-class')
  })
})
