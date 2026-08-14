import { describe, it, expect } from 'vitest'
import {
  extractPlaceholders,
  findMissingVariables,
  renderTemplateBody,
  renderTemplateHtml,
} from '@/lib/services/template-render'

describe('renderTemplateBody', () => {
  it('substitutes a placeholder', () => {
    expect(renderTemplateBody('Hi {{customer_name}},', { customer_name: 'Chad' }))
      .toBe('Hi Chad,')
  })

  it('tolerates whitespace inside the braces', () => {
    expect(renderTemplateBody('Hi {{ customer_name }}', { customer_name: 'Chad' }))
      .toBe('Hi Chad')
  })

  it('substitutes the same placeholder everywhere it appears', () => {
    expect(renderTemplateBody('{{a}} and {{a}}', { a: 'x' })).toBe('x and x')
  })

  it('renders an unknown placeholder as nothing', () => {
    // Never a fallback lookup. Templates must not be able to reach data the
    // scheduler did not declare customer-safe.
    expect(renderTemplateBody('Hi {{unknown}}!', {})).toBe('Hi !')
  })

  it('treats null and undefined as empty', () => {
    expect(renderTemplateBody('[{{a}}][{{b}}]', { a: null, b: undefined })).toBe('[][]')
  })

  it('does not re-scan substituted values', () => {
    // A value that looks like a placeholder is inert text. Otherwise data
    // typed into a form could name a variable the author never referenced.
    expect(renderTemplateBody('{{a}}', { a: '{{secret}}', secret: 'leaked' }))
      .toBe('{{secret}}')
  })

  it('leaves malformed braces alone', () => {
    expect(renderTemplateBody('{{ }} and { a } and {{a', { a: 'x' }))
      .toBe('{{ }} and { a } and {{a')
  })

  it('returns the body unchanged when there is nothing to substitute', () => {
    expect(renderTemplateBody('No variables here.', { a: 'x' })).toBe('No variables here.')
  })

  it('handles a realistic template', () => {
    const body = 'Hi {{customer_name}},\n\nYour appointment with {{company_name}} is on {{scheduled_date}} at {{scheduled_time}}.'
    expect(
      renderTemplateBody(body, {
        customer_name: 'Chad Hughes',
        company_name: 'Advanced Health & Safety',
        scheduled_date: 'Monday, August 17',
        scheduled_time: '9:00 AM',
      })
    ).toBe('Hi Chad Hughes,\n\nYour appointment with Advanced Health & Safety is on Monday, August 17 at 9:00 AM.')
  })
})

describe('extractPlaceholders', () => {
  it('lists placeholders in first-use order without repeats', () => {
    expect(extractPlaceholders('{{b}} {{a}} {{b}}')).toEqual(['b', 'a'])
  })

  it('returns nothing for a body with no placeholders', () => {
    expect(extractPlaceholders('plain text')).toEqual([])
  })
})

describe('findMissingVariables', () => {
  it('reports placeholders with no value', () => {
    expect(findMissingVariables('{{a}} {{b}}', { a: 'x' })).toEqual(['b'])
  })

  it('counts an empty string as missing', () => {
    // An empty value produces a message with a hole in it, which is what the
    // warning exists to catch.
    expect(findMissingVariables('{{a}}', { a: '' })).toEqual(['a'])
  })

  it('reports nothing when everything is supplied', () => {
    expect(findMissingVariables('{{a}}', { a: 'x' })).toEqual([])
  })
})

describe('renderTemplateHtml', () => {
  it('wraps paragraphs and converts single line breaks', () => {
    expect(renderTemplateHtml('One\nTwo\n\nThree', {}))
      .toBe('<p>One<br />Two</p>\n<p>Three</p>')
  })

  it('escapes markup in the template itself', () => {
    expect(renderTemplateHtml('<b>bold</b>', {}))
      .toBe('<p>&lt;b&gt;bold&lt;/b&gt;</p>')
  })

  it('escapes markup arriving through a variable', () => {
    expect(renderTemplateHtml('{{note}}', { note: '<script>alert(1)</script>' }))
      .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('escapes ampersands in a company name', () => {
    expect(renderTemplateHtml('{{company_name}}', { company_name: 'Advanced Health & Safety' }))
      .toBe('<p>Advanced Health &amp; Safety</p>')
  })
})
