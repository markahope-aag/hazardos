import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatCurrency } from '@/lib/utils'
import type { Invoice, InvoiceLineItem } from '@/types/invoices'
import type { InvoiceOrganization } from '@/lib/services/invoice-pdf-generator'

/**
 * Invoice PDFs are the last thing a customer sees before they pay: a wrong
 * total, a missing discount line, or a mangled date on this document is a
 * customer-visible, money-related bug. This module does no math of its own
 * (totals are computed upstream and passed in); its job is to lay values out
 * correctly and never crash on missing/edge-case data. These tests assert on
 * the values and text handed to the PDF library, not on rendered PDF bytes.
 */

interface TextCall {
  text: string | string[]
  x: number
  y: number
  options?: { align?: string }
}

interface MockDoc {
  textCalls: TextCall[]
  fillRects: Array<{ x: number; y: number; w: number; h: number }>
  pages: number
  savedAs?: string
  outputType?: string
  internal: {
    pageSize: { getWidth: () => number; getHeight: () => number }
    getNumberOfPages: () => number
  }
  text: (text: string | string[], x: number, y: number, options?: { align?: string }) => void
  setFontSize: (n: number) => void
  setTextColor: (c: string) => void
  setFont: (family: string, style: string) => void
  setDrawColor: (c: string) => void
  setFillColor: (r: number, g: number, b: number) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  rect: (x: number, y: number, w: number, h: number, style: string) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
  addPage: () => void
  setPage: (n: number) => void
  output: (type: string) => ArrayBuffer
  save: (filename: string) => void
}

let lastDoc: MockDoc

function createMockDoc(): MockDoc {
  const doc: MockDoc = {
    textCalls: [],
    fillRects: [],
    pages: 1,
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => doc.pages,
    },
    text: (text, x, y, options) => {
      doc.textCalls.push({ text, x, y, options })
    },
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    setDrawColor: vi.fn(),
    setFillColor: vi.fn(),
    line: vi.fn(),
    rect: (x, y, w, h) => {
      doc.fillRects.push({ x, y, w, h })
    },
    // Simulate real wrapping so long notes/terms can force a page break.
    splitTextToSize: (text: string, _maxWidth: number) => {
      const chunkSize = 40
      const lines: string[] = []
      for (let i = 0; i < text.length; i += chunkSize) {
        lines.push(text.slice(i, i + chunkSize))
      }
      return lines.length ? lines : ['']
    },
    addPage: () => {
      doc.pages += 1
    },
    setPage: vi.fn(),
    output: (type: string) => {
      doc.outputType = type
      return new TextEncoder().encode('PDF-BYTES').buffer
    },
    save: (filename: string) => {
      doc.savedAs = filename
    },
  }
  return doc
}

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(function mockJsPDF(this: MockDoc) {
    lastDoc = createMockDoc()
    return lastDoc
  }),
}))

const { generateInvoicePDF, generateInvoicePDFBase64, downloadInvoicePDF, invoicePdfFilename } =
  await import('@/lib/services/invoice-pdf-generator')

function findText(doc: MockDoc, matcher: string | RegExp): TextCall[] {
  return doc.textCalls.filter((c) => {
    const t = Array.isArray(c.text) ? c.text.join(' ') : c.text
    return typeof matcher === 'string' ? t.includes(matcher) : matcher.test(t)
  })
}

function createLineItem(overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem {
  return {
    id: 'li-1',
    invoice_id: 'inv-1',
    description: 'Asbestos removal, living room',
    quantity: 1,
    unit: 'ea',
    unit_price: 500,
    line_total: 500,
    source_type: null,
    source_id: null,
    sort_order: 0,
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

function createInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    organization_id: 'org-1',
    job_id: 'job-1',
    customer_id: 'cust-1',
    location_id: null,
    invoice_number: 'INV-2026-0001',
    status: 'sent',
    invoice_date: '2026-08-01',
    due_date: '2026-08-15',
    subtotal: 1000,
    tax_rate: 0.08,
    tax_amount: 80,
    discount_amount: 0,
    total: 1080,
    amount_paid: 0,
    balance_due: 1080,
    payment_terms: null,
    notes: null,
    sent_at: null,
    sent_via: null,
    viewed_at: null,
    access_token: null,
    access_token_expires_at: null,
    qb_invoice_id: null,
    qb_synced_at: null,
    created_by: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    customer: {
      id: 'cust-1',
      name: 'Jane Doe',
      company_name: null,
      email: 'jane@example.com',
      phone: '555-1234',
      address_line1: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    job: {
      id: 'job-1',
      job_number: 'JOB-2026-001',
      job_address: '123 Main St',
      job_city: 'Springfield',
      job_state: 'IL',
    },
    line_items: [createLineItem()],
    ...overrides,
  }
}

function createOrganization(overrides: Partial<InvoiceOrganization> = {}): InvoiceOrganization {
  return {
    name: 'HazardOS Remediation',
    email: 'billing@hazardos.app',
    phone: '555-0000',
    address: '456 Industrial Way',
    city: 'Metropolis',
    state: 'IL',
    zip: '62702',
    website: 'hazardos.app',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateInvoicePDF: totals section', () => {
  it('renders subtotal formatted as currency', () => {
    const doc = generateInvoicePDF(createInvoice({ subtotal: 1234.5 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, formatCurrency(1234.5)).length).toBeGreaterThan(0)
  })

  it('renders the total formatted as currency', () => {
    const doc = generateInvoicePDF(createInvoice({ total: 9999.99 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, formatCurrency(9999.99)).length).toBeGreaterThan(0)
  })

  it('renders balance due formatted as currency', () => {
    const doc = generateInvoicePDF(createInvoice({ balance_due: 250.75 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, formatCurrency(250.75)).length).toBeGreaterThan(0)
  })

  it('shows the tax line with percentage label when tax_rate is set', () => {
    const doc = generateInvoicePDF(
      createInvoice({ tax_amount: 80, tax_rate: 0.08 }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, 'Tax (8.00%)').length).toBe(1)
  })

  it('shows a plain "Tax" label when tax_amount is set but tax_rate is falsy', () => {
    const doc = generateInvoicePDF(
      createInvoice({ tax_amount: 50, tax_rate: 0 }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, /^Tax$/).length).toBe(1)
    expect(findText(doc as unknown as MockDoc, formatCurrency(50)).length).toBeGreaterThan(0)
  })

  it('omits the tax line entirely when tax_amount is zero', () => {
    const doc = generateInvoicePDF(
      createInvoice({ tax_amount: 0, tax_rate: 0 }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, /Tax/).length).toBe(0)
  })

  it('shows the discount line, negated, when discount_amount is positive', () => {
    const doc = generateInvoicePDF(createInvoice({ discount_amount: 100 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, `-${formatCurrency(100)}`).length).toBe(1)
  })

  it('omits the discount line when discount_amount is zero', () => {
    const doc = generateInvoicePDF(
      createInvoice({ discount_amount: 0 }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, 'Discount').length).toBe(0)
  })

  it('shows the paid line, negated, when amount_paid is positive', () => {
    const doc = generateInvoicePDF(createInvoice({ amount_paid: 300 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, `-${formatCurrency(300)}`).length).toBe(1)
  })

  it('omits the paid line when amount_paid is zero', () => {
    const doc = generateInvoicePDF(createInvoice({ amount_paid: 0 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Paid').length).toBe(0)
  })

  it('renders a negative balance due (credit) using the currency formatter as-is', () => {
    // Overpayment / credit scenario: balance_due can go negative. The module
    // does not special-case this; it renders whatever formatCurrency produces.
    const doc = generateInvoicePDF(createInvoice({ balance_due: -50 }), createOrganization())
    expect(findText(doc as unknown as MockDoc, formatCurrency(-50)).length).toBeGreaterThan(0)
  })

  it('renders very large totals with correct currency formatting', () => {
    const doc = generateInvoicePDF(
      createInvoice({ total: 1234567.89, balance_due: 1234567.89 }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, formatCurrency(1234567.89)).length).toBeGreaterThan(0)
  })
})

describe('generateInvoicePDF: line items', () => {
  it('renders each line item with formatted unit price and line total', () => {
    const items = [
      createLineItem({ description: 'Item A', quantity: 2, unit_price: 150, line_total: 300 }),
      createLineItem({ id: 'li-2', description: 'Item B', quantity: 1, unit_price: 75.5, line_total: 75.5 }),
    ]
    const doc = generateInvoicePDF(createInvoice({ line_items: items }), createOrganization())
    const mockDoc = doc as unknown as MockDoc
    expect(findText(mockDoc, formatCurrency(150)).length).toBeGreaterThan(0)
    expect(findText(mockDoc, formatCurrency(300)).length).toBeGreaterThan(0)
    expect(findText(mockDoc, formatCurrency(75.5)).length).toBeGreaterThan(0)
  })

  it('renders quantity as a plain string, including zero and fractional values', () => {
    const items = [
      createLineItem({ quantity: 0 }),
      createLineItem({ id: 'li-2', quantity: 2.5 }),
    ]
    const doc = generateInvoicePDF(createInvoice({ line_items: items }), createOrganization())
    const mockDoc = doc as unknown as MockDoc
    expect(findText(mockDoc, '0').length).toBeGreaterThan(0)
    expect(findText(mockDoc, '2.5').length).toBeGreaterThan(0)
  })

  it('draws the line-items table header only when there are line items', () => {
    const doc = generateInvoicePDF(createInvoice({ line_items: [createLineItem()] }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Description').length).toBe(1)
  })

  it('skips the line-items table entirely for an empty line_items array', () => {
    const doc = generateInvoicePDF(createInvoice({ line_items: [] }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Description').length).toBe(0)
  })

  it('does not crash when line_items is undefined', () => {
    const invoice = createInvoice()
    delete (invoice as { line_items?: InvoiceLineItem[] }).line_items
    expect(() => generateInvoicePDF(invoice, createOrganization())).not.toThrow()
  })
})

describe('generateInvoicePDF: customer / bill-to', () => {
  it('prefers company_name over name for the bill-to line', () => {
    const doc = generateInvoicePDF(
      createInvoice({
        customer: {
          id: 'c1',
          name: 'Jane Doe',
          company_name: 'Acme Corp',
          email: null,
          phone: null,
          address_line1: null,
          city: null,
          state: null,
          zip: null,
        },
      }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, 'Acme Corp').length).toBe(1)
    expect(findText(doc as unknown as MockDoc, 'Jane Doe').length).toBe(0)
  })

  it('falls back to "Customer" when no customer is attached', () => {
    const invoice = createInvoice()
    delete (invoice as { customer?: Invoice['customer'] }).customer
    const doc = generateInvoicePDF(invoice, createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Customer').length).toBe(1)
  })

  it('does not render an address line when the customer has none', () => {
    const invoice = createInvoice({
      customer: {
        id: 'c1',
        name: 'Jane Doe',
        company_name: null,
        email: null,
        phone: null,
        address_line1: null,
        city: null,
        state: null,
        zip: null,
      },
    })
    delete (invoice as { job?: Invoice['job'] }).job
    const doc = generateInvoicePDF(invoice, createOrganization())
    expect(findText(doc as unknown as MockDoc, '123 Main St').length).toBe(0)
  })
})

describe('generateInvoicePDF: organization header', () => {
  it('renders organization name, address, and contact info when provided', () => {
    const doc = generateInvoicePDF(createInvoice(), createOrganization())
    const mockDoc = doc as unknown as MockDoc
    expect(findText(mockDoc, 'HazardOS Remediation').length).toBe(1)
    expect(findText(mockDoc, /456 Industrial Way/).length).toBe(1)
    expect(findText(mockDoc, /555-0000/).length).toBe(1)
  })

  it('falls back to "Company Name" when organization.name is null', () => {
    const doc = generateInvoicePDF(createInvoice(), createOrganization({ name: null }))
    expect(findText(doc as unknown as MockDoc, 'Company Name').length).toBe(1)
  })

  it('does not throw and skips the header block entirely when organization is null', () => {
    expect(() => generateInvoicePDF(createInvoice(), null)).not.toThrow()
    const doc = generateInvoicePDF(createInvoice(), null)
    expect(findText(doc as unknown as MockDoc, 'HazardOS Remediation').length).toBe(0)
  })

  it('omits the address line when organization has no address', () => {
    const doc = generateInvoicePDF(createInvoice(), createOrganization({ address: null }))
    expect(findText(doc as unknown as MockDoc, /Industrial Way/).length).toBe(0)
  })

  it('omits the contact-info line when phone, email, and website are all missing', () => {
    const doc = generateInvoicePDF(
      createInvoice(),
      createOrganization({ phone: null, email: null, website: null }),
    )
    expect(findText(doc as unknown as MockDoc, /555-0000/).length).toBe(0)
  })
})

describe('generateInvoicePDF: job reference', () => {
  it('renders the job number and address when a job is attached', () => {
    const doc = generateInvoicePDF(createInvoice(), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Job JOB-2026-001').length).toBe(1)
  })

  it('omits the job reference line when no job is attached', () => {
    const invoice = createInvoice()
    delete (invoice as { job?: Invoice['job'] }).job
    const doc = generateInvoicePDF(invoice, createOrganization())
    expect(findText(doc as unknown as MockDoc, /^Job /).length).toBe(0)
  })
})

describe('generateInvoicePDF: invoice number and dates', () => {
  it('renders the invoice number', () => {
    // Appears twice: once in the header, once in the page footer.
    const doc = generateInvoicePDF(createInvoice({ invoice_number: 'INV-2026-9999' }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'INV-2026-9999').length).toBeGreaterThanOrEqual(1)
  })

  it('formats a valid invoice_date as a short month/day/year string', () => {
    const doc = generateInvoicePDF(createInvoice({ invoice_date: '2026-08-01' }), createOrganization())
    const expected = new Date('2026-08-01').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    expect(findText(doc as unknown as MockDoc, expected).length).toBe(1)
  })

  it('falls back to the raw string for an unparseable due_date', () => {
    const doc = generateInvoicePDF(createInvoice({ due_date: 'not-a-date' }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'not-a-date').length).toBe(1)
  })
})

describe('generateInvoicePDF: notes, terms, and pagination', () => {
  it('renders payment terms when present', () => {
    const doc = generateInvoicePDF(
      createInvoice({ payment_terms: 'Net 30 days from invoice date' }),
      createOrganization(),
    )
    expect(findText(doc as unknown as MockDoc, 'Payment Terms').length).toBe(1)
  })

  it('omits the payment terms section when null', () => {
    const doc = generateInvoicePDF(createInvoice({ payment_terms: null }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Payment Terms').length).toBe(0)
  })

  it('renders notes when present', () => {
    const doc = generateInvoicePDF(createInvoice({ notes: 'Thank you for your business.' }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Notes').length).toBe(1)
  })

  it('omits the notes section when null', () => {
    const doc = generateInvoicePDF(createInvoice({ notes: null }), createOrganization())
    expect(findText(doc as unknown as MockDoc, 'Notes').length).toBe(0)
  })

  it('stamps every page with a matching "Page X of N" footer', () => {
    const doc = generateInvoicePDF(createInvoice(), createOrganization())
    const mockDoc = doc as unknown as MockDoc
    const footerCalls = findText(mockDoc, new RegExp(`Page \\d+ of ${mockDoc.pages}`))
    expect(footerCalls.length).toBe(mockDoc.pages)
  })

  it('adds a page when a long line-item list needs more room than one page holds', () => {
    // addPageIfNeeded is checked per line item, so a long enough items list
    // does force a second page (unlike a single long notes/terms block,
    // which is measured and drawn in one shot without a mid-block check).
    const manyItems = Array.from({ length: 40 }, (_, i) =>
      createLineItem({ id: `li-${i}`, description: `Item ${i}` }),
    )
    const doc = generateInvoicePDF(createInvoice({ line_items: manyItems }), createOrganization())
    const mockDoc = doc as unknown as MockDoc
    expect(mockDoc.pages).toBeGreaterThan(1)
  })
})

describe('generateInvoicePDFBase64', () => {
  it('returns a base64 string derived from the PDF output buffer', () => {
    const result = generateInvoicePDFBase64(createInvoice(), createOrganization())
    const expected = Buffer.from(new TextEncoder().encode('PDF-BYTES').buffer).toString('base64')
    expect(result).toBe(expected)
  })
})

describe('downloadInvoicePDF', () => {
  it('saves the file named after the invoice number', () => {
    downloadInvoicePDF(createInvoice({ invoice_number: 'INV-2026-0042' }), createOrganization())
    expect(lastDoc.savedAs).toBe('Invoice-INV-2026-0042.pdf')
  })
})

describe('invoicePdfFilename', () => {
  it('builds the filename from the invoice number', () => {
    expect(invoicePdfFilename(createInvoice({ invoice_number: 'INV-2026-0007' }))).toBe(
      'Invoice-INV-2026-0007.pdf',
    )
  })
})
