import { render, screen } from '@testing-library/react'
import { InvoiceHistory } from '@/components/billing/invoice-history'
import type { BillingInvoice } from '@/types/billing'

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date | string, formatStr: string) => {
    const d = new Date(date)
    if (formatStr === 'MMM d, yyyy') {
      const month = d.toLocaleDateString('en-US', { month: 'short' })
      const day = d.getDate()
      const year = d.getFullYear()
      return `${month} ${day}, ${year}`
    }
    return date.toString()
  },
}))

// Mock billing types
vi.mock('@/types/billing', () => ({
  invoiceStatusConfig: {
    draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    open: { label: 'Open', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
    void: { label: 'Void', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    uncollectible: { label: 'Uncollectible', color: 'text-red-700', bgColor: 'bg-red-100' },
  },
}))

const mockInvoices: BillingInvoice[] = [
  {
    id: 'inv_001',
    organization_id: 'org_123',
    subscription_id: 'sub_123',
    stripe_invoice_id: 'in_abcdef123456',
    stripe_payment_intent_id: 'pi_123',
    invoice_number: 'INV-001',
    status: 'paid',
    subtotal: 9900,
    tax: 0,
    total: 9900,
    amount_paid: 9900,
    amount_due: 0,
    invoice_date: '2024-01-15T12:00:00Z', // Use noon to avoid timezone issues
    due_date: '2024-01-30T12:00:00Z',
    paid_at: '2024-01-15T12:00:00Z',
    invoice_pdf_url: 'https://stripe.com/invoice.pdf',
    hosted_invoice_url: 'https://stripe.com/invoice',
    created_at: '2024-01-15T12:00:00Z',
  },
  {
    id: 'inv_002',
    organization_id: 'org_123',
    subscription_id: 'sub_123',
    stripe_invoice_id: 'in_ghijkl789012',
    stripe_payment_intent_id: null,
    invoice_number: 'INV-002',
    status: 'open',
    subtotal: 19900,
    tax: 1792,
    total: 21692,
    amount_paid: 0,
    amount_due: 21692,
    invoice_date: '2024-02-15T12:00:00Z',
    due_date: '2024-03-01T12:00:00Z',
    paid_at: null,
    invoice_pdf_url: null,
    hosted_invoice_url: 'https://stripe.com/invoice2',
    created_at: '2024-02-15T12:00:00Z',
  },
  {
    id: 'inv_003',
    organization_id: 'org_123',
    subscription_id: 'sub_123',
    stripe_invoice_id: 'in_mnopqr345678',
    stripe_payment_intent_id: null,
    invoice_number: null,
    status: 'void',
    subtotal: 4900,
    tax: 0,
    total: 4900,
    amount_paid: 0,
    amount_due: 0,
    invoice_date: null,
    due_date: null,
    paid_at: null,
    invoice_pdf_url: null,
    hosted_invoice_url: null,
    created_at: '2024-03-01T12:00:00Z',
  },
]

describe('InvoiceHistory', () => {
  describe('empty state', () => {
    it('should render empty state when no invoices', () => {
      render(<InvoiceHistory invoices={[]} />)

      expect(screen.getByText('Invoice History')).toBeInTheDocument()
      expect(screen.getByText('Your billing history will appear here')).toBeInTheDocument()
      expect(screen.getByText('No invoices yet')).toBeInTheDocument()
    })

    it('should not render table when no invoices', () => {
      render(<InvoiceHistory invoices={[]} />)

      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('with invoices', () => {
    it('should render invoice table', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      expect(screen.getByText('Invoice History')).toBeInTheDocument()
      expect(screen.getByText('View and download your past invoices')).toBeInTheDocument()
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should render table headers', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      expect(screen.getByText('Invoice')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should render invoice numbers', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.getByText('INV-002')).toBeInTheDocument()
    })

    it('should fallback to stripe invoice id when no invoice number', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      // The third invoice has no invoice_number, should show last 8 chars of stripe_invoice_id
      // stripe_invoice_id is 'in_mnopqr345678', slice(-8) = 'qr345678'
      expect(screen.getByText('qr345678')).toBeInTheDocument()
    })

    it('should render invoice dates', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      // Dates are formatted by the component
      // The table has date cells, verify at least one date is rendered
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(4) // 1 header + 3 data rows

      // Just verify dates exist (timezone-agnostic)
      expect(screen.getByText(/Jan 1[45],? 2024|Dec 3[01],? 2023/)).toBeInTheDocument()
    })

    it('should show dash for missing dates', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      // Third invoice has no invoice_date
      const cells = screen.getAllByRole('cell')
      const dateCell = cells.find(cell => cell.textContent === '-')
      expect(dateCell).toBeInTheDocument()
    })

    it('should render invoice amounts', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      expect(screen.getByText('$99.00')).toBeInTheDocument()
      expect(screen.getByText('$216.92')).toBeInTheDocument()
      expect(screen.getByText('$49.00')).toBeInTheDocument()
    })

    it('should render status badges', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      expect(screen.getByText('Paid')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
      expect(screen.getByText('Void')).toBeInTheDocument()
    })

    it('should render download button when pdf url available', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      const downloadLinks = screen.getAllByRole('link')
      const pdfLink = downloadLinks.find(link =>
        link.getAttribute('href') === 'https://stripe.com/invoice.pdf'
      )
      expect(pdfLink).toBeInTheDocument()
      expect(pdfLink).toHaveAttribute('target', '_blank')
      expect(pdfLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render external link button when hosted url available', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      const externalLinks = screen.getAllByRole('link')
      const hostedLink = externalLinks.find(link =>
        link.getAttribute('href') === 'https://stripe.com/invoice'
      )
      expect(hostedLink).toBeInTheDocument()
      expect(hostedLink).toHaveAttribute('target', '_blank')
    })

    it('should not render action buttons when no urls available', () => {
      const invoiceNoUrls: BillingInvoice[] = [{
        ...mockInvoices[0],
        id: 'inv_no_urls',
        invoice_pdf_url: null,
        hosted_invoice_url: null,
      }]

      render(<InvoiceHistory invoices={invoiceNoUrls} />)

      // Should have empty actions cell
      const rows = screen.getAllByRole('row')
      const dataRow = rows[1] // First data row after header
      const cells = dataRow.querySelectorAll('td')
      const actionsCell = cells[cells.length - 1]
      const links = actionsCell.querySelectorAll('a')
      expect(links).toHaveLength(0)
    })

    it('should render correct number of rows', () => {
      render(<InvoiceHistory invoices={mockInvoices} />)

      const rows = screen.getAllByRole('row')
      // 1 header row + 3 data rows
      expect(rows).toHaveLength(4)
    })
  })

  describe('status display', () => {
    it('should render paid status with correct styling', () => {
      render(<InvoiceHistory invoices={[mockInvoices[0]]} />)

      const badge = screen.getByText('Paid')
      expect(badge).toHaveClass('text-green-700', 'bg-green-100')
    })

    it('should render open status with correct styling', () => {
      render(<InvoiceHistory invoices={[mockInvoices[1]]} />)

      const badge = screen.getByText('Open')
      expect(badge).toHaveClass('text-blue-700', 'bg-blue-100')
    })

    it('should render void status with correct styling', () => {
      render(<InvoiceHistory invoices={[mockInvoices[2]]} />)

      const badge = screen.getByText('Void')
      expect(badge).toHaveClass('text-gray-700', 'bg-gray-100')
    })

    it('should handle unknown status', () => {
      const unknownStatusInvoice: BillingInvoice = {
        ...mockInvoices[0],
        status: 'unknown_status' as any,
      }

      render(<InvoiceHistory invoices={[unknownStatusInvoice]} />)

      // Should display the raw status when config not found
      expect(screen.getByText('unknown_status')).toBeInTheDocument()
    })
  })

  describe('currency formatting', () => {
    it('should format cents to dollars', () => {
      const invoice: BillingInvoice = {
        ...mockInvoices[0],
        total: 12345, // $123.45
      }

      render(<InvoiceHistory invoices={[invoice]} />)

      expect(screen.getByText('$123.45')).toBeInTheDocument()
    })

    it('should format large amounts with commas', () => {
      const invoice: BillingInvoice = {
        ...mockInvoices[0],
        total: 1234567, // $12,345.67
      }

      render(<InvoiceHistory invoices={[invoice]} />)

      expect(screen.getByText('$12,345.67')).toBeInTheDocument()
    })

    it('should format zero amount', () => {
      const invoice: BillingInvoice = {
        ...mockInvoices[0],
        total: 0,
      }

      render(<InvoiceHistory invoices={[invoice]} />)

      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle invoice with minimal data', () => {
      const minimalInvoice: BillingInvoice = {
        id: 'inv_minimal',
        organization_id: 'org_123',
        subscription_id: null,
        stripe_invoice_id: null,
        stripe_payment_intent_id: null,
        invoice_number: null,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amount_paid: 0,
        amount_due: 0,
        invoice_date: null,
        due_date: null,
        paid_at: null,
        invoice_pdf_url: null,
        hosted_invoice_url: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      render(<InvoiceHistory invoices={[minimalInvoice]} />)

      // Should show dash for invoice number and date
      const cells = screen.getAllByRole('cell')
      const dashCells = cells.filter(cell => cell.textContent === '-')
      expect(dashCells.length).toBeGreaterThanOrEqual(2)
    })

    it('should render single invoice correctly', () => {
      render(<InvoiceHistory invoices={[mockInvoices[0]]} />)

      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(2) // 1 header + 1 data row
    })

    it('should handle many invoices', () => {
      const manyInvoices = Array.from({ length: 50 }, (_, i) => ({
        ...mockInvoices[0],
        id: `inv_${i}`,
        invoice_number: `INV-${i.toString().padStart(3, '0')}`,
      }))

      render(<InvoiceHistory invoices={manyInvoices} />)

      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(51) // 1 header + 50 data rows
    })
  })
})
