import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { TabStrip, tabId, tabPanelId } from '@/components/ui/tab-strip'

// The point of this component is the behavior a plain row of buttons was
// missing, so that is what these cover: the set is announced as a set, one tab
// is current, and the arrow keys move between them.

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'activity', label: 'Activity' },
] as const

function Harness({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState<string>('overview')
  return (
    <TabStrip
      tabs={TABS}
      value={value}
      onChange={(id) => {
        setValue(id)
        onChange?.(id)
      }}
      baseId="test"
      label="Test sections"
    />
  )
}

describe('TabStrip', () => {
  it('announces itself as a labeled tab set', () => {
    render(<Harness />)
    expect(screen.getByRole('tablist', { name: 'Test sections' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('marks exactly one tab selected', () => {
    render(<Harness />)
    const selected = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveAccessibleName('Overview')
  })

  it('points each tab at its panel', () => {
    render(<Harness />)
    const tab = screen.getByRole('tab', { name: 'Financials' })
    expect(tab).toHaveAttribute('id', tabId('test', 'financials'))
    expect(tab).toHaveAttribute('aria-controls', tabPanelId('test', 'financials'))
  })

  it('keeps only the selected tab in the tab order', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Financials' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('tabindex', '-1')
  })

  it('selects on click', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(onChange).toHaveBeenCalledWith('activity')
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true')
  })

  it('moves right and left with the arrow keys', async () => {
    render(<Harness />)
    const first = screen.getByRole('tab', { name: 'Overview' })
    first.focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Financials' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Financials' })).toHaveFocus()

    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('wraps at both ends', async () => {
    render(<Harness />)
    screen.getByRole('tab', { name: 'Overview' }).focus()

    // Left from the first tab lands on the last.
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true')

    // Right from the last comes back to the first.
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('jumps to the ends with Home and End', async () => {
    render(<Harness />)
    screen.getByRole('tab', { name: 'Overview' }).focus()

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })
})
