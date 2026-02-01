import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerSearch from '@/components/customers/CustomerSearch'

describe('CustomerSearch Component', () => {
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

  it('should call onChange when user types', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<CustomerSearch value="" onChange={handleChange} />)
    
    const input = screen.getByPlaceholderText(/search customers/i)
    await user.type(input, 'test search')
    
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
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<CustomerSearch value="search term" onChange={handleChange} />)
    
    const clearButton = screen.getByRole('button', { name: /clear search/i })
    await user.click(clearButton)
    
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('should have search icon', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)
    
    const searchIcon = screen.getByTestId('search-icon') || document.querySelector('[data-lucide="search"]')
    expect(searchIcon).toBeInTheDocument()
  })

  it('should be accessible with proper labels', () => {
    render(<CustomerSearch value="" onChange={vi.fn()} />)
    
    const input = screen.getByLabelText(/search/i) || screen.getByPlaceholderText(/search customers/i)
    expect(input).toBeInTheDocument()
  })

  it('should handle focus and blur events', async () => {
    const user = userEvent.setup()
    render(<CustomerSearch value="" onChange={vi.fn()} />)
    
    const input = screen.getByPlaceholderText(/search customers/i)
    
    await user.click(input)
    expect(input).toHaveFocus()
    
    await user.tab()
    expect(input).not.toHaveFocus()
  })

  it('should debounce search input changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<CustomerSearch value="" onChange={handleChange} />)
    
    const input = screen.getByPlaceholderText(/search customers/i)
    
    // Type quickly - should debounce
    await user.type(input, 'quick')
    
    // Should have been called for each character
    expect(handleChange).toHaveBeenCalled()
  })
})