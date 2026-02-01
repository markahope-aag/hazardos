import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from '@/components/ui/icon-button'
import { Search, Plus, X } from 'lucide-react'

describe('IconButton Component', () => {
  it('should render icon button with label', () => {
    render(<IconButton label="Search" icon={<Search />} />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Search')
  })

  it('should render icon with aria-hidden', () => {
    render(<IconButton label="Search" icon={<Search data-testid="search-icon" />} />)

    const icon = screen.getByTestId('search-icon')
    const iconContainer = icon.parentElement
    expect(iconContainer).toHaveAttribute('aria-hidden', 'true')
  })

  it('should show screen reader only label by default', () => {
    render(<IconButton label="Search" icon={<Search />} />)

    const srLabel = screen.getByText('Search')
    expect(srLabel).toHaveClass('sr-only')
  })

  it('should show visible label when showLabel is true', () => {
    render(<IconButton label="Search" icon={<Search />} showLabel />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).not.toHaveAttribute('aria-label')
    
    const visibleLabel = screen.getByText('Search')
    expect(visibleLabel).not.toHaveClass('sr-only')
    expect(visibleLabel).toHaveClass('ml-2')
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<IconButton label="Add item" icon={<Plus />} onClick={handleClick} />)

    const button = screen.getByRole('button', { name: /add item/i })
    await user.click(button)

    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<IconButton label="Delete" icon={<X />} disabled />)

    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toBeDisabled()
  })

  it('should apply custom className', () => {
    render(<IconButton label="Search" icon={<Search />} className="custom-class" />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toHaveClass('custom-class')
  })

  it('should apply different button variants', () => {
    render(<IconButton label="Search" icon={<Search />} variant="outline" />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toHaveClass('border-gray-300') // outline variant class
  })

  it('should apply different button sizes', () => {
    render(<IconButton label="Search" icon={<Search />} size="sm" />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toHaveClass('h-9') // sm size class
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<IconButton ref={ref} label="Search" icon={<Search />} />)

    expect(ref).toHaveBeenCalled()
  })

  it('should handle different icon types', () => {
    const { rerender } = render(<IconButton label="Search" icon={<Search />} />)
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()

    rerender(<IconButton label="Add" icon={<Plus />} />)
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()

    rerender(<IconButton label="Close" icon={<X />} />)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('should handle custom icon content', () => {
    const CustomIcon = () => <span data-testid="custom-icon">★</span>
    render(<IconButton label="Favorite" icon={<CustomIcon />} />)

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /favorite/i })).toBeInTheDocument()
  })

  it('should apply px-2 class when label is not shown', () => {
    render(<IconButton label="Search" icon={<Search />} showLabel={false} />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toHaveClass('px-2')
  })

  it('should not apply px-2 class when label is shown', () => {
    render(<IconButton label="Search" icon={<Search />} showLabel />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).not.toHaveClass('px-2')
  })

  it('should handle long labels', () => {
    const longLabel = 'This is a very long button label that should still work correctly'
    render(<IconButton label={longLabel} icon={<Search />} showLabel />)

    expect(screen.getByText(longLabel)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(longLabel, 'i') })).toBeInTheDocument()
  })

  it('should handle special characters in label', () => {
    const specialLabel = 'Search & Filter (Advanced)'
    render(<IconButton label={specialLabel} icon={<Search />} />)

    expect(screen.getByRole('button', { name: specialLabel })).toBeInTheDocument()
  })

  it('should maintain accessibility with both label modes', () => {
    // Test hidden label mode
    const { rerender } = render(<IconButton label="Search" icon={<Search />} showLabel={false} />)
    
    let button = screen.getByRole('button', { name: /search/i })
    expect(button).toHaveAttribute('aria-label', 'Search')

    // Test visible label mode
    rerender(<IconButton label="Search" icon={<Search />} showLabel />)
    
    button = screen.getByRole('button', { name: /search/i })
    expect(button).not.toHaveAttribute('aria-label')
  })

  it('should pass through all button props', () => {
    render(
      <IconButton
        label="Search"
        icon={<Search />}
        type="submit"
        form="search-form"
        data-testid="search-button"
      />
    )

    const button = screen.getByTestId('search-button')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('form', 'search-form')
  })
})