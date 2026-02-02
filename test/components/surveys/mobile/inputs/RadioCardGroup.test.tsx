import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioCardGroup } from '@/components/surveys/mobile/inputs/radio-card-group'
import { Home, Building } from 'lucide-react'

const mockOptions = [
  { value: 'residential', label: 'Residential', description: 'For homes' },
  { value: 'commercial', label: 'Commercial', description: 'For businesses' },
]

describe('RadioCardGroup Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <RadioCardGroup
          value={null}
          onChange={() => {}}
          options={mockOptions}
        />
      )
    ).not.toThrow()
  })

  it('should render all options', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByText('Residential')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
  })

  it('should render descriptions', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByText('For homes')).toBeInTheDocument()
    expect(screen.getByText('For businesses')).toBeInTheDocument()
  })

  it('should call onChange when option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RadioCardGroup
        value={null}
        onChange={onChange}
        options={mockOptions}
      />
    )

    await user.click(screen.getByText('Residential'))
    expect(onChange).toHaveBeenCalledWith('residential')
  })

  it('should show selected state', () => {
    render(
      <RadioCardGroup
        value="residential"
        onChange={() => {}}
        options={mockOptions}
      />
    )

    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons[0]).toHaveAttribute('aria-checked', 'true')
    expect(radioButtons[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('should have radiogroup role', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('should have radio role on options', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getAllByRole('radio')).toHaveLength(2)
  })

  it('should be disabled when disabled prop is true', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RadioCardGroup
        value={null}
        onChange={onChange}
        options={mockOptions}
        disabled
      />
    )

    await user.click(screen.getByText('Residential'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should accept custom className', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
        className="custom-class"
      />
    )

    expect(screen.getByRole('radiogroup')).toHaveClass('custom-class')
  })

  it('should support 2 columns layout', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
        columns={2}
      />
    )

    expect(screen.getByRole('radiogroup')).toHaveClass('grid-cols-2')
  })

  it('should use 1 column by default', () => {
    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={mockOptions}
      />
    )

    expect(screen.getByRole('radiogroup')).toHaveClass('grid-cols-1')
  })

  it('should render with icons', () => {
    const optionsWithIcons = [
      { value: 'home', label: 'Home', icon: Home },
      { value: 'building', label: 'Building', icon: Building },
    ]

    const { container } = render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={optionsWithIcons}
      />
    )

    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('should render with emoji icons', () => {
    const optionsWithEmoji = [
      { value: 'yes', label: 'Yes', iconEmoji: '👍' },
      { value: 'no', label: 'No', iconEmoji: '👎' },
    ]

    render(
      <RadioCardGroup
        value={null}
        onChange={() => {}}
        options={optionsWithEmoji}
      />
    )

    expect(screen.getByText('👍')).toBeInTheDocument()
    expect(screen.getByText('👎')).toBeInTheDocument()
  })
})
