import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AsbestosForm } from '@/components/surveys/mobile/hazards/asbestos-form'

describe('AsbestosForm', () => {
  it('returns null (legacy stub)', () => {
    const { container } = render(<AsbestosForm />)
    expect(container.firstChild).toBeNull()
  })
})
