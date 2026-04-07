import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MoldForm } from '@/components/surveys/mobile/hazards/mold-form'

describe('MoldForm', () => {
  it('returns null (legacy stub)', () => {
    const { container } = render(<MoldForm />)
    expect(container.firstChild).toBeNull()
  })
})
