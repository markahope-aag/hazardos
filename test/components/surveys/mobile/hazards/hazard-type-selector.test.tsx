import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HazardTypeSelector } from '@/components/surveys/mobile/hazards/hazard-type-selector'

describe('HazardTypeSelector', () => {
  it('returns null (legacy stub)', () => {
    const { container } = render(<HazardTypeSelector />)
    expect(container.firstChild).toBeNull()
  })
})
