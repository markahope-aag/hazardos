import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckboxGroup, SingleCheckbox } from '@/components/surveys/mobile/inputs/checkbox-group'

describe('CheckboxGroup', () => {
  const mockOnChange = vi.fn()
  const mockOptions = [
    { value: 'option1', label: 'Option 1', description: 'First option' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', description: 'Third option' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all checkbox options', () => {
    render(
      <CheckboxGroup
        values={[]}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('should show descriptions when provided', () => {
    render(
      <CheckboxGroup
        values={[]}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    expect(screen.getByText('First option')).toBeInTheDocument()
    expect(screen.getByText('Third option')).toBeInTheDocument()
  })

  it('should check selected values', () => {
    render(
      <CheckboxGroup
        values={['option1', 'option3']}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false')
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true')
  })

  it('should add value when unchecked option clicked', async () => {
    render(
      <CheckboxGroup
        values={['option1']}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    const option2 = screen.getByText('Option 2')
    await userEvent.click(option2)

    expect(mockOnChange).toHaveBeenCalledWith(['option1', 'option2'])
  })

  it('should remove value when checked option clicked', async () => {
    render(
      <CheckboxGroup
        values={['option1', 'option2']}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    const option1 = screen.getByText('Option 1')
    await userEvent.click(option1)

    expect(mockOnChange).toHaveBeenCalledWith(['option2'])
  })

  it('should not call onChange when disabled', async () => {
    render(
      <CheckboxGroup
        values={[]}
        onChange={mockOnChange}
        options={mockOptions}
        disabled={true}
      />
    )

    const option1 = screen.getByText('Option 1')
    await userEvent.click(option1)

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should render in single column by default', () => {
    const { container } = render(
      <CheckboxGroup
        values={[]}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    const grid = container.querySelector('[role="group"]')
    expect(grid?.className).toContain('grid-cols-1')
  })

  it('should render in two columns when specified', () => {
    const { container } = render(
      <CheckboxGroup
        values={[]}
        onChange={mockOnChange}
        options={mockOptions}
        columns={2}
      />
    )

    const grid = container.querySelector('[role="group"]')
    expect(grid?.className).toContain('grid-cols-2')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <CheckboxGroup
        values={[]}
        onChange={mockOnChange}
        options={mockOptions}
        className="custom-class"
      />
    )

    const grid = container.querySelector('[role="group"]')
    expect(grid?.className).toContain('custom-class')
  })

  it('should have proper ARIA attributes', () => {
    render(
      <CheckboxGroup
        values={['option1']}
        onChange={mockOnChange}
        options={mockOptions}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)
    checkboxes.forEach(checkbox => {
      expect(checkbox).toHaveAttribute('aria-checked')
    })
  })
})

describe('SingleCheckbox', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label', () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={mockOnChange}
        label="Test Label"
      />
    )

    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={mockOnChange}
        label="Test Label"
        description="Test description"
      />
    )

    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('should toggle checked state on click', async () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={mockOnChange}
        label="Test Label"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    await userEvent.click(checkbox)

    expect(mockOnChange).toHaveBeenCalledWith(true)
  })

  it('should toggle unchecked state on click', async () => {
    render(
      <SingleCheckbox
        checked={true}
        onChange={mockOnChange}
        label="Test Label"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    await userEvent.click(checkbox)

    expect(mockOnChange).toHaveBeenCalledWith(false)
  })

  it('should not call onChange when disabled', async () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={mockOnChange}
        label="Test Label"
        disabled={true}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    await userEvent.click(checkbox)

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should have aria-checked true when checked', () => {
    render(
      <SingleCheckbox
        checked={true}
        onChange={mockOnChange}
        label="Test Label"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })

  it('should have aria-checked false when unchecked', () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={mockOnChange}
        label="Test Label"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
  })

  it('should apply custom className', () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={mockOnChange}
        label="Test Label"
        className="custom-class"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox.className).toContain('custom-class')
  })
})
