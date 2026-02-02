import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckboxGroup, SingleCheckbox } from '@/components/surveys/mobile/inputs/checkbox-group'

describe('CheckboxGroup', () => {
  const options = [
    { value: 'option1' as const, label: 'Option 1' },
    { value: 'option2' as const, label: 'Option 2' },
    { value: 'option3' as const, label: 'Option 3', description: 'Description' },
  ]

  it('renders all options', () => {
    render(<CheckboxGroup values={[]} onChange={() => {}} options={options} />)

    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('renders option descriptions when provided', () => {
    render(<CheckboxGroup values={[]} onChange={() => {}} options={options} />)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('marks selected options as checked', () => {
    render(<CheckboxGroup values={['option1', 'option2']} onChange={() => {}} options={options} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange when option is toggled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<CheckboxGroup values={[]} onChange={handleChange} options={options} />)

    await user.click(screen.getByText('Option 1'))
    expect(handleChange).toHaveBeenCalledWith(['option1'])
  })

  it('removes option when already selected', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<CheckboxGroup values={['option1']} onChange={handleChange} options={options} />)

    await user.click(screen.getByText('Option 1'))
    expect(handleChange).toHaveBeenCalledWith([])
  })

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<CheckboxGroup values={[]} onChange={handleChange} options={options} disabled />)

    await user.click(screen.getByText('Option 1'))
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('renders with two columns when specified', () => {
    const { container } = render(
      <CheckboxGroup values={[]} onChange={() => {}} options={options} columns={2} />
    )
    expect(container.querySelector('.grid-cols-2')).toBeInTheDocument()
  })

  it('renders with one column by default', () => {
    const { container } = render(
      <CheckboxGroup values={[]} onChange={() => {}} options={options} />
    )
    expect(container.querySelector('.grid-cols-1')).toBeInTheDocument()
  })
})

describe('SingleCheckbox', () => {
  it('renders with label', () => {
    render(<SingleCheckbox checked={false} onChange={() => {}} label="Single Option" />)
    expect(screen.getByText('Single Option')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <SingleCheckbox
        checked={false}
        onChange={() => {}}
        label="Option"
        description="A description"
      />
    )
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  it('shows checked state', () => {
    render(<SingleCheckbox checked={true} onChange={() => {}} label="Checked" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<SingleCheckbox checked={false} onChange={handleChange} label="Toggle" />)

    await user.click(screen.getByRole('checkbox'))
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('toggles from checked to unchecked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<SingleCheckbox checked={true} onChange={handleChange} label="Toggle" />)

    await user.click(screen.getByRole('checkbox'))
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<SingleCheckbox checked={false} onChange={handleChange} label="Disabled" disabled />)

    await user.click(screen.getByRole('checkbox'))
    expect(handleChange).not.toHaveBeenCalled()
  })
})
