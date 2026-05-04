import jsPDF from 'jspdf'
import type { Invoice } from '@/types/invoices'
import { formatCurrency } from '@/lib/utils'

const HAZARDOS_ORANGE = '#FF6B35'
const DARK_GRAY = '#1F2937'
const LIGHT_GRAY = '#6B7280'
const BORDER_GRAY = '#E5E7EB'

export interface InvoiceOrganization {
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  website: string | null
}

export function generateInvoicePDF(
  invoice: Invoice,
  organization: InvoiceOrganization | null,
): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  const addPageIfNeeded = (space: number) => {
    if (y + space > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const drawLine = (yPos: number) => {
    doc.setDrawColor(BORDER_GRAY)
    doc.line(margin, yPos, pageWidth - margin, yPos)
  }

  // Header — company identity
  if (organization) {
    doc.setFontSize(24)
    doc.setTextColor(HAZARDOS_ORANGE)
    doc.setFont('helvetica', 'bold')
    doc.text(organization.name || 'Company Name', margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setTextColor(LIGHT_GRAY)
    doc.setFont('helvetica', 'normal')

    if (organization.address) {
      const address = [
        organization.address,
        [organization.city, organization.state, organization.zip].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join(' | ')
      doc.text(address, margin, y)
      y += 5
    }

    const contactInfo = [organization.phone, organization.email, organization.website]
      .filter(Boolean)
      .join(' | ')
    if (contactInfo) {
      doc.text(contactInfo, margin, y)
      y += 5
    }
  }

  y += 10
  drawLine(y)
  y += 15

  // Title + invoice number
  doc.setFontSize(20)
  doc.setTextColor(DARK_GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', margin, y)

  doc.setFontSize(12)
  doc.setTextColor(LIGHT_GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoice_number, pageWidth - margin, y, { align: 'right' })
  y += 15

  // Bill-to + dates side-by-side
  const customer = invoice.customer

  doc.setFontSize(10)
  doc.setTextColor(LIGHT_GRAY)
  doc.text('BILL TO', margin, y)

  doc.text('INVOICE DATE', pageWidth - margin - 60, y)
  y += 5

  doc.setFontSize(11)
  doc.setTextColor(DARK_GRAY)
  doc.setFont('helvetica', 'bold')
  const customerName = customer?.company_name || customer?.name || 'Customer'
  doc.text(customerName, margin, y)

  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(invoice.invoice_date), pageWidth - margin, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  if (customer?.email) {
    doc.text(customer.email, margin, y)
  }
  doc.setFontSize(10)
  doc.setTextColor(LIGHT_GRAY)
  doc.text('DUE DATE', pageWidth - margin - 60, y)
  y += 4

  doc.setFontSize(11)
  doc.setTextColor(DARK_GRAY)
  if (customer?.phone) {
    doc.text(customer.phone, margin, y)
  }
  doc.setFont('helvetica', 'bold')
  doc.text(formatDate(invoice.due_date), pageWidth - margin, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  y += 5

  if (customer?.address_line1) {
    doc.text(customer.address_line1, margin, y)
    y += 5
    const cityLine = [customer.city, customer.state, customer.zip].filter(Boolean).join(' ')
    if (cityLine) {
      doc.text(cityLine, margin, y)
      y += 5
    }
  }

  y += 10
  drawLine(y)
  y += 10

  // Job reference
  if (invoice.job) {
    doc.setFontSize(10)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(`Job ${invoice.job.job_number}`, margin, y)
    if (invoice.job.job_address) {
      const jobAddr = [
        invoice.job.job_address,
        [invoice.job.job_city, invoice.job.job_state].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join(' — ')
      doc.text(jobAddr, pageWidth - margin, y, { align: 'right' })
    }
    y += 8
  }

  // Line items table
  const lineItems = invoice.line_items || []
  if (lineItems.length > 0) {
    addPageIfNeeded(40)

    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y - 4, contentWidth, 9, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK_GRAY)

    const colDescX = margin + 2
    const colQtyX = margin + contentWidth * 0.55
    const colPriceX = margin + contentWidth * 0.72
    const colTotalX = pageWidth - margin

    doc.text('Description', colDescX, y + 1)
    doc.text('Qty', colQtyX, y + 1, { align: 'right' })
    doc.text('Price', colPriceX, y + 1, { align: 'right' })
    doc.text('Total', colTotalX, y + 1, { align: 'right' })
    y += 9

    doc.setFont('helvetica', 'normal')
    for (const item of lineItems) {
      addPageIfNeeded(10)
      const descLines = doc.splitTextToSize(item.description, contentWidth * 0.5)
      doc.text(descLines, colDescX, y)
      doc.text(String(item.quantity), colQtyX, y, { align: 'right' })
      doc.text(formatCurrency(item.unit_price), colPriceX, y, { align: 'right' })
      doc.text(formatCurrency(item.line_total), colTotalX, y, { align: 'right' })
      y += Math.max(7, descLines.length * 5)
    }
    y += 3
  }

  // Totals
  addPageIfNeeded(60)
  drawLine(y)
  y += 8

  const summaryX = pageWidth - margin - 70

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(LIGHT_GRAY)
  doc.text('Subtotal', summaryX, y)
  doc.setTextColor(DARK_GRAY)
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' })
  y += 7

  if (invoice.tax_amount > 0) {
    doc.setTextColor(LIGHT_GRAY)
    const taxLabel = invoice.tax_rate
      ? `Tax (${(invoice.tax_rate * 100).toFixed(2)}%)`
      : 'Tax'
    doc.text(taxLabel, summaryX, y)
    doc.setTextColor(DARK_GRAY)
    doc.text(formatCurrency(invoice.tax_amount), pageWidth - margin, y, { align: 'right' })
    y += 7
  }

  if (invoice.discount_amount > 0) {
    doc.setTextColor(LIGHT_GRAY)
    doc.text('Discount', summaryX, y)
    doc.setTextColor(DARK_GRAY)
    doc.text(`-${formatCurrency(invoice.discount_amount)}`, pageWidth - margin, y, {
      align: 'right',
    })
    y += 7
  }

  y += 2
  drawLine(y)
  y += 7

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK_GRAY)
  doc.text('Total', summaryX, y)
  doc.text(formatCurrency(invoice.total), pageWidth - margin, y, { align: 'right' })
  y += 8

  if (invoice.amount_paid > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(LIGHT_GRAY)
    doc.text('Paid', summaryX, y)
    doc.setTextColor(DARK_GRAY)
    doc.text(`-${formatCurrency(invoice.amount_paid)}`, pageWidth - margin, y, { align: 'right' })
    y += 7
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK_GRAY)
  doc.text('Balance Due', summaryX, y)
  doc.setTextColor(HAZARDOS_ORANGE)
  doc.text(formatCurrency(invoice.balance_due), pageWidth - margin, y, { align: 'right' })
  y += 15

  // Payment terms + notes
  if (invoice.payment_terms) {
    addPageIfNeeded(20)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK_GRAY)
    doc.text('Payment Terms', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(LIGHT_GRAY)
    const termsLines = doc.splitTextToSize(invoice.payment_terms, contentWidth)
    doc.text(termsLines, margin, y)
    y += termsLines.length * 5 + 5
  }

  if (invoice.notes) {
    addPageIfNeeded(20)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK_GRAY)
    doc.text('Notes', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(LIGHT_GRAY)
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5 + 5
  }

  // Footer
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text(`Invoice ${invoice.invoice_number}`, margin, pageHeight - 10)
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    })
  }

  return doc
}

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function generateInvoicePDFBase64(
  invoice: Invoice,
  organization: InvoiceOrganization | null,
): string {
  const doc = generateInvoicePDF(invoice, organization)
  const buffer = doc.output('arraybuffer')
  return Buffer.from(buffer).toString('base64')
}

export function downloadInvoicePDF(
  invoice: Invoice,
  organization: InvoiceOrganization | null,
): void {
  const doc = generateInvoicePDF(invoice, organization)
  doc.save(`Invoice-${invoice.invoice_number}.pdf`)
}

export function invoicePdfFilename(invoice: Invoice): string {
  return `Invoice-${invoice.invoice_number}.pdf`
}
