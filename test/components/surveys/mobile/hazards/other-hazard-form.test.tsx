import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { OtherHazardForm } from '@/components/surveys/mobile/hazards/other-hazard-form'

describe('OtherHazardForm', () => {
  it('returns null (legacy stub)', () => {
    const { container } = render(<OtherHazardForm />)
    expect(container.firstChild).toBeNull()
  })
})
