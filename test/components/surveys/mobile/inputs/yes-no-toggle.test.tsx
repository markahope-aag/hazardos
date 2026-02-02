import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YesNoToggle, YesNoNaToggle } from '@/components/surveys/mobile/inputs/yes-no-toggle'

describe('YesNoToggle', () => {
  it('renders yes and no buttons', () => {
    render(<YesNoToggle value={null} onChange={() => {}} />)

    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('renders with custom labels', () => {
    render(
      <YesNoToggle value={null} onChange={() => {}} yesLabel="Accept" noLabel="Decline" />
    )

    expect(screen.getByText('Accept')).toBeInTheDocument()
    expect(screen.getByText('Decline')).toBeInTheDocument()
  })

  it('highlights yes button when value is true', () => {
    render(<YesNoToggle value={true} onChange={() => {}} />)

    const yesButton = screen.getByText('Yes').closest('button')
    expect(yesButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlights no button when value is false', () => {
    render(<YesNoToggle value={false} onChange={() => {}} />)

    const noButton = screen.getByText('No').closest('button')
    expect(noButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange with true when yes is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<YesNoToggle value={null} onChange={handleChange} />)

    await user.click(screen.getByText('Yes'))
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when no is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<YesNoToggle value={null} onChange={handleChange} />)

    await user.click(screen.getByText('No'))
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<YesNoToggle value={null} onChange={handleChange} disabled />)

    await user.click(screen.getByText('Yes'))
    expect(handleChange).not.toHaveBeenCalled()
  })
})

describe('YesNoNaToggle', () => {
  it('renders yes, no, and N/A buttons', () => {
    render(<YesNoNaToggle value={null} onChange={() => {}} />)

    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders with custom labels', () => {
    render(
      <YesNoNaToggle
        value={null}
        onChange={() => {}}
        yesLabel="True"
        noLabel="False"
        naLabel="Unknown"
      />
    )

    expect(screen.getByText('True')).toBeInTheDocument()
    expect(screen.getByText('False')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('highlights N/A button when value is null', () => {
    render(<YesNoNaToggle value={null} onChange={() => {}} />)

    const naButton = screen.getByText('N/A').closest('button')
    expect(naButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange with null when N/A is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<YesNoNaToggle value={true} onChange={handleChange} />)

    await user.click(screen.getByText('N/A'))
    expect(handleChange).toHaveBeenCalledWith(null)
  })

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<YesNoNaToggle value={null} onChange={handleChange} disabled />)

    await user.click(screen.getByText('Yes'))
    expect(handleChange).not.toHaveBeenCalled()
  })
})
