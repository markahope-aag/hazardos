import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LeadForm } from '@/components/surveys/mobile/hazards/lead-form'

describe('LeadForm', () => {
  it('returns null (legacy stub)', () => {
    const { container } = render(<LeadForm />)
    expect(container.firstChild).toBeNull()
  })
})
