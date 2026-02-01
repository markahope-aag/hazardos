import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YesNoToggle, YesNoNaToggle } from '@/components/surveys/mobile/inputs/YesNoToggle'

describe('YesNoToggle Component', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default labels', () => {
    render(<YesNoToggle value={null} onChange={mockOnChange} />)

    expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument()
  })

  it('should render with custom labels', () => {
    render(
      <YesNoToggle
        value={null}
        onChange={mockOnChange}
        yesLabel="Agree"
        noLabel="Disagree"
      />
    )

    expect(screen.getByRole('button', { name: /agree/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disagree/i })).toBeInTheDocument()
  })

  it('should call onChange with true when yes button is clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoToggle value={null} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    await user.click(yesButton)

    expect(mockOnChange).toHaveBeenCalledWith(true)
  })

  it('should call onChange with false when no button is clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoToggle value={null} onChange={mockOnChange} />)

    const noButton = screen.getByRole('button', { name: /no/i })
    await user.click(noButton)

    expect(mockOnChange).toHaveBeenCalledWith(false)
  })

  it('should show selected state for yes', () => {
    render(<YesNoToggle value={true} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })

    expect(yesButton).toHaveAttribute('aria-pressed', 'true')
    expect(noButton).toHaveAttribute('aria-pressed', 'false')
    expect(yesButton).toHaveClass('bg-green-600')
  })

  it('should show selected state for no', () => {
    render(<YesNoToggle value={false} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })

    expect(yesButton).toHaveAttribute('aria-pressed', 'false')
    expect(noButton).toHaveAttribute('aria-pressed', 'true')
    expect(noButton).toHaveClass('bg-red-600')
  })

  it('should show unselected state when value is null', () => {
    render(<YesNoToggle value={null} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })

    expect(yesButton).toHaveAttribute('aria-pressed', 'false')
    expect(noButton).toHaveAttribute('aria-pressed', 'false')
    expect(yesButton).not.toHaveClass('bg-green-600')
    expect(noButton).not.toHaveClass('bg-red-600')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<YesNoToggle value={null} onChange={mockOnChange} disabled />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })

    expect(yesButton).toBeDisabled()
    expect(noButton).toBeDisabled()
    expect(yesButton).toHaveAttribute('aria-disabled', 'true')
    expect(noButton).toHaveAttribute('aria-disabled', 'true')
  })

  it('should not call onChange when disabled and clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoToggle value={null} onChange={mockOnChange} disabled />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    await user.click(yesButton)

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    render(<YesNoToggle value={null} onChange={mockOnChange} className="custom-class" />)

    const container = screen.getByRole('button', { name: /yes/i }).parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should have proper accessibility attributes', () => {
    render(<YesNoToggle value={true} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })

    expect(yesButton).toHaveAttribute('type', 'button')
    expect(noButton).toHaveAttribute('type', 'button')
    expect(yesButton).toHaveAttribute('aria-pressed', 'true')
    expect(noButton).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('YesNoNaToggle Component', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default labels', () => {
    render(<YesNoNaToggle value={null} onChange={mockOnChange} />)

    expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /n\/a/i })).toBeInTheDocument()
  })

  it('should render with custom labels', () => {
    render(
      <YesNoNaToggle
        value={null}
        onChange={mockOnChange}
        yesLabel="Agree"
        noLabel="Disagree"
        naLabel="Skip"
      />
    )

    expect(screen.getByText('Agree')).toBeInTheDocument()
    expect(screen.getByText('Disagree')).toBeInTheDocument()
    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('should call onChange with true when yes button is clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoNaToggle value={null} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    await user.click(yesButton)

    expect(mockOnChange).toHaveBeenCalledWith(true)
  })

  it('should call onChange with false when no button is clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoNaToggle value={null} onChange={mockOnChange} />)

    const noButton = screen.getByRole('button', { name: /no/i })
    await user.click(noButton)

    expect(mockOnChange).toHaveBeenCalledWith(false)
  })

  it('should call onChange with null when N/A button is clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoNaToggle value={true} onChange={mockOnChange} />)

    const naButton = screen.getByRole('button', { name: /n\/a/i })
    await user.click(naButton)

    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('should show selected state for yes', () => {
    render(<YesNoNaToggle value={true} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })
    const naButton = screen.getByRole('button', { name: /n\/a/i })

    expect(yesButton).toHaveAttribute('aria-pressed', 'true')
    expect(noButton).toHaveAttribute('aria-pressed', 'false')
    expect(naButton).toHaveAttribute('aria-pressed', 'false')
    expect(yesButton).toHaveClass('bg-green-600')
  })

  it('should show selected state for no', () => {
    render(<YesNoNaToggle value={false} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })
    const naButton = screen.getByRole('button', { name: /n\/a/i })

    expect(yesButton).toHaveAttribute('aria-pressed', 'false')
    expect(noButton).toHaveAttribute('aria-pressed', 'true')
    expect(naButton).toHaveAttribute('aria-pressed', 'false')
    expect(noButton).toHaveClass('bg-red-600')
  })

  it('should show selected state for N/A', () => {
    render(<YesNoNaToggle value={null} onChange={mockOnChange} />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })
    const naButton = screen.getByRole('button', { name: /n\/a/i })

    expect(yesButton).toHaveAttribute('aria-pressed', 'false')
    expect(noButton).toHaveAttribute('aria-pressed', 'false')
    expect(naButton).toHaveAttribute('aria-pressed', 'true')
    expect(naButton).toHaveClass('bg-gray-600')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<YesNoNaToggle value={null} onChange={mockOnChange} disabled />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    const noButton = screen.getByRole('button', { name: /no/i })
    const naButton = screen.getByRole('button', { name: /n\/a/i })

    expect(yesButton).toBeDisabled()
    expect(noButton).toBeDisabled()
    expect(naButton).toBeDisabled()
  })

  it('should not call onChange when disabled and clicked', async () => {
    const user = userEvent.setup()
    render(<YesNoNaToggle value={null} onChange={mockOnChange} disabled />)

    const yesButton = screen.getByRole('button', { name: /yes/i })
    await user.click(yesButton)

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    render(<YesNoNaToggle value={null} onChange={mockOnChange} className="custom-class" />)

    const container = screen.getByRole('button', { name: /yes/i }).parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should handle state transitions correctly', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<YesNoNaToggle value={null} onChange={mockOnChange} />)

    // Start with N/A selected
    const yesButton = screen.getByRole('button', { name: /yes/i })
    expect(yesButton).toHaveAttribute('aria-pressed', 'false')

    // Click Yes
    await user.click(yesButton)
    expect(mockOnChange).toHaveBeenCalledWith(true)

    // Simulate state change
    rerender(<YesNoNaToggle value={true} onChange={mockOnChange} />)
    expect(yesButton).toHaveAttribute('aria-pressed', 'true')

    // Click No
    const noButton = screen.getByRole('button', { name: /no/i })
    await user.click(noButton)
    expect(mockOnChange).toHaveBeenCalledWith(false)
  })
})