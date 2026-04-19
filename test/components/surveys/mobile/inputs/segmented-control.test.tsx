import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from '@/components/surveys/mobile/inputs/segmented-control'

const mockOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

describe('SegmentedControl Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <SegmentedControl
          value={null}
          onChange={() => {}}
          options={mockOptions}
        />
      )
    ).not.toThrow()
  })

  it('should render all options', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('should call onChange when option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SegmentedControl
        value={null}
        onChange={onChange}
        options={mockOptions}
      />
    )

    await user.click(screen.getByText('Medium'))
    expect(onChange).toHaveBeenCalledWith('medium')
  })

  it('should show selected state', () => {
    render(
      <SegmentedControl
        value="medium"
        onChange={() => {}}
        options={mockOptions}
      />
    )

    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons[0]).toHaveAttribute('aria-checked', 'false')
    expect(radioButtons[1]).toHaveAttribute('aria-checked', 'true')
    expect(radioButtons[2]).toHaveAttribute('aria-checked', 'false')
  })

  it('should have radiogroup role', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('should have radio role on options', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('should be disabled when disabled prop is true', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SegmentedControl
        value={null}
        onChange={onChange}
        options={mockOptions}
        disabled
      />
    )

    await user.click(screen.getByText('Low'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should accept custom className', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
        className="custom-control"
      />
    )

    expect(screen.getByRole('radiogroup')).toHaveClass('custom-control')
  })

  it('should support numeric values', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const numericOptions = [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' },
      { value: 3, label: 'Three' },
    ]

    render(
      <SegmentedControl
        value={null}
        onChange={onChange}
        options={numericOptions}
      />
    )

    await user.click(screen.getByText('Two'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('should apply size classes for sm size', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
        size="sm"
      />
    )

    const buttons = screen.getAllByRole('radio')
    expect(buttons[0]).toHaveClass('text-sm')
  })

  it('should apply size classes for lg size', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
        size="lg"
      />
    )

    const buttons = screen.getAllByRole('radio')
    expect(buttons[0]).toHaveClass('text-lg')
  })

  it('should have bg-muted base styling', () => {
    render(
      <SegmentedControl
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByRole('radiogroup')).toHaveClass('bg-muted')
  })
})
