import jsPDF from 'jspdf'
import type { ProposalWithRelations, EstimateLineItem, LineItemType } from '@/types/estimates'
import { formatCurrency } from '@/lib/utils'

const LINE_ITEM_TYPE_LABELS: Record<LineItemType, string> = {
  labor: 'Labor',
  equipment: 'Equipment',
  material: 'Materials',
  disposal: 'Disposal',
  travel: 'Travel',
  permit: 'Permits',
  testing: 'Testing',
  other: 'Other',
}

const HAZARDOS_ORANGE = '#FF6B35'
const DARK_GRAY = '#1F2937'
const LIGHT_GRAY = '#6B7280'
const BORDER_GRAY = '#E5E7EB'

interface GeneratePDFOptions {
  includeLineItems?: boolean
  includeTerms?: boolean
}

export function generateProposalPDF(
  proposal: ProposalWithRelations,
  options: GeneratePDFOptions = {}
): jsPDF {
  const { includeLineItems = true, includeTerms = true } = options

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  const drawLine = (yPos: number) => {
    doc.setDrawColor(BORDER_GRAY)
    doc.line(margin, yPos, pageWidth - margin, yPos)
  }

  // Header with company info
  const organization = proposal.organization
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
        [organization.city, organization.state, organization.zip].filter(Boolean).join(', ')
      ].filter(Boolean).join(' | ')
      doc.text(address, margin, y)
      y += 5
    }

    const contactInfo = [
      organization.phone,
      organization.email,
      organization.website
    ].filter(Boolean).join(' | ')
    if (contactInfo) {
      doc.text(contactInfo, margin, y)
      y += 5
    }
  }

  y += 10
  drawLine(y)
  y += 15

  // Proposal title and number
  doc.setFontSize(20)
  doc.setTextColor(DARK_GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSAL', margin, y)

  doc.setFontSize(12)
  doc.setTextColor(LIGHT_GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(proposal.proposal_number, pageWidth - margin, y, { align: 'right' })
  y += 15

  // Customer and Site info in two columns
  const customer = proposal.customer
  const estimate = proposal.estimate
  const siteSurvey = estimate?.site_survey

  // Left column - Customer
  doc.setFontSize(10)
  doc.setTextColor(LIGHT_GRAY)
  doc.text('PREPARED FOR', margin, y)
  y += 5

  doc.setFontSize(11)
  doc.setTextColor(DARK_GRAY)
  doc.setFont('helvetica', 'bold')
  const customerName = customer?.company_name ||
    `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
    'Customer'
  doc.text(customerName, margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  if (customer?.email) {
    doc.text(customer.email, margin, y)
    y += 4
  }
  if (customer?.phone) {
    doc.text(customer.phone, margin, y)
    y += 4
  }

  y += 10

  // Site Location
  if (siteSurvey) {
    doc.setFontSize(10)
    doc.setTextColor(LIGHT_GRAY)
    doc.text('SITE LOCATION', margin, y)
    y += 5

    doc.setFontSize(11)
    doc.setTextColor(DARK_GRAY)
    doc.text(siteSurvey.site_address || '', margin, y)
    y += 5
    doc.text(
      `${siteSurvey.site_city || ''}, ${siteSurvey.site_state || ''} ${siteSurvey.site_zip || ''}`,
      margin,
      y
    )
    y += 5

    if (siteSurvey.hazard_type) {
      doc.setFontSize(10)
      doc.setTextColor(HAZARDOS_ORANGE)
      doc.text(`Hazard Type: ${siteSurvey.hazard_type.toUpperCase()}`, margin, y)
    }
  }

  y += 15
  drawLine(y)
  y += 10

  // Date and validity
  doc.setFontSize(10)
  doc.setTextColor(LIGHT_GRAY)
  const dateInfo = [
    `Date: ${new Date().toLocaleDateString()}`,
    proposal.valid_until ? `Valid Until: ${new Date(proposal.valid_until).toLocaleDateString()}` : '',
    estimate?.estimated_duration_days ? `Est. Duration: ${estimate.estimated_duration_days} days` : ''
  ].filter(Boolean).join('  |  ')
  doc.text(dateInfo, margin, y)
  y += 10

  // Cover Letter
  if (proposal.cover_letter) {
    addNewPageIfNeeded(40)
    doc.setFontSize(12)
    doc.setTextColor(DARK_GRAY)
    const coverLines = doc.splitTextToSize(proposal.cover_letter, contentWidth)
    doc.text(coverLines, margin, y)
    y += coverLines.length * 5 + 10
  }

  // Scope of Work
  if (estimate?.scope_of_work) {
    addNewPageIfNeeded(50)
    doc.setFontSize(14)
    doc.setTextColor(DARK_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('Scope of Work', margin, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const scopeLines = doc.splitTextToSize(estimate.scope_of_work, contentWidth)
    doc.text(scopeLines, margin, y)
    y += scopeLines.length * 5 + 10
  }

  // Inclusions
  if (proposal.inclusions && proposal.inclusions.length > 0) {
    addNewPageIfNeeded(30 + proposal.inclusions.length * 6)
    doc.setFontSize(14)
    doc.setTextColor(DARK_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text("What's Included", margin, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    for (const inclusion of proposal.inclusions) {
      doc.text(`• ${inclusion}`, margin + 5, y)
      y += 6
    }
    y += 5
  }

  // Line Items
  if (includeLineItems && estimate?.line_items && estimate.line_items.length > 0) {
    addNewPageIfNeeded(60)

    doc.setFontSize(14)
    doc.setTextColor(DARK_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('Pricing Details', margin, y)
    y += 10

    // Group line items by type
    const groupedItems = estimate.line_items.reduce((acc, item) => {
      if (!item.is_included) return acc
      const type = item.item_type as LineItemType
      if (!acc[type]) acc[type] = []
      acc[type].push(item)
      return acc
    }, {} as Record<LineItemType, EstimateLineItem[]>)

    // Table header
    const colWidths = {
      description: contentWidth * 0.5,
      qty: contentWidth * 0.1,
      unit: contentWidth * 0.15,
      total: contentWidth * 0.25,
    }

    for (const [type, items] of Object.entries(groupedItems)) {
      addNewPageIfNeeded(20 + items.length * 8)

      // Category header
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, y - 4, contentWidth, 8, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK_GRAY)
      doc.text(LINE_ITEM_TYPE_LABELS[type as LineItemType], margin + 2, y)
      y += 8

      // Items
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      for (const item of items) {
        addNewPageIfNeeded(10)

        let x = margin
        doc.setTextColor(DARK_GRAY)

        // Description (truncate if too long)
        const descText = item.description.length > 40
          ? item.description.substring(0, 37) + '...'
          : item.description
        doc.text(descText, x, y)
        x += colWidths.description

        // Quantity
        doc.text(String(item.quantity), x + colWidths.qty - 5, y, { align: 'right' })
        x += colWidths.qty

        // Unit
        doc.text(item.unit || 'each', x, y)
        x += colWidths.unit

        // Total
        doc.text(formatCurrency(item.total_price), margin + contentWidth, y, { align: 'right' })

        y += 7
      }
      y += 3
    }

    // Summary
    y += 5
    addNewPageIfNeeded(50)
    drawLine(y)
    y += 10

    const summaryX = pageWidth - margin - 80

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(LIGHT_GRAY)
    doc.text('Subtotal:', summaryX, y)
    doc.setTextColor(DARK_GRAY)
    doc.text(formatCurrency(estimate.subtotal), pageWidth - margin, y, { align: 'right' })
    y += 7

    if (estimate.markup_percent > 0) {
      doc.setTextColor(LIGHT_GRAY)
      doc.text('Service Fee:', summaryX, y)
      doc.setTextColor(DARK_GRAY)
      doc.text(formatCurrency(estimate.markup_amount), pageWidth - margin, y, { align: 'right' })
      y += 7
    }

    if (estimate.tax_percent > 0) {
      doc.setTextColor(LIGHT_GRAY)
      doc.text('Tax:', summaryX, y)
      doc.setTextColor(DARK_GRAY)
      doc.text(formatCurrency(estimate.tax_amount), pageWidth - margin, y, { align: 'right' })
      y += 7
    }

    y += 3
    drawLine(y)
    y += 8

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK_GRAY)
    doc.text('TOTAL:', summaryX, y)
    doc.setTextColor(HAZARDOS_ORANGE)
    doc.text(formatCurrency(estimate.total), pageWidth - margin, y, { align: 'right' })
    y += 15
  }

  // Payment Terms
  if (proposal.payment_terms) {
    addNewPageIfNeeded(40)
    doc.setFontSize(14)
    doc.setTextColor(DARK_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Terms', margin, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const paymentLines = doc.splitTextToSize(proposal.payment_terms, contentWidth)
    doc.text(paymentLines, margin, y)
    y += paymentLines.length * 5 + 10
  }

  // Exclusions
  if (proposal.exclusions && proposal.exclusions.length > 0) {
    addNewPageIfNeeded(30 + proposal.exclusions.length * 6)
    doc.setFontSize(14)
    doc.setTextColor(DARK_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('Exclusions', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(LIGHT_GRAY)
    for (const exclusion of proposal.exclusions) {
      doc.text(`• ${exclusion}`, margin + 5, y)
      y += 6
    }
    y += 5
  }

  // Terms and Conditions
  if (includeTerms && proposal.terms_and_conditions) {
    addNewPageIfNeeded(50)
    doc.setFontSize(14)
    doc.setTextColor(DARK_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('Terms and Conditions', margin, y)
    y += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(LIGHT_GRAY)
    const termsLines = doc.splitTextToSize(proposal.terms_and_conditions, contentWidth)
    doc.text(termsLines, margin, y)
    y += termsLines.length * 4 + 15
  }

  // Signature Section
  addNewPageIfNeeded(60)
  y += 10
  drawLine(y)
  y += 15

  doc.setFontSize(14)
  doc.setTextColor(DARK_GRAY)
  doc.setFont('helvetica', 'bold')
  doc.text('Acceptance', margin, y)
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'By signing below, you accept the terms and conditions outlined in this proposal.',
    margin,
    y
  )
  y += 20

  // Signature lines
  const sigWidth = (contentWidth - 20) / 2

  // Customer signature
  doc.setDrawColor(DARK_GRAY)
  doc.line(margin, y, margin + sigWidth, y)
  doc.setFontSize(10)
  doc.text('Customer Signature', margin, y + 5)
  doc.text('Date: _______________', margin, y + 12)

  // Company signature
  doc.line(margin + sigWidth + 20, y, pageWidth - margin, y)
  doc.text('Authorized Representative', margin + sigWidth + 20, y + 5)
  doc.text('Date: _______________', margin + sigWidth + 20, y + 12)

  // Footer on all pages
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.text(
      `Proposal ${proposal.proposal_number}`,
      margin,
      pageHeight - 10
    )
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    )
  }

  return doc
}

/**
 * Generate and download PDF for a proposal
 */
export function downloadProposalPDF(proposal: ProposalWithRelations): void {
  const doc = generateProposalPDF(proposal)
  const filename = `Proposal-${proposal.proposal_number}.pdf`
  doc.save(filename)
}

/**
 * Generate PDF as base64 for email attachment
 */
export function generateProposalPDFBase64(proposal: ProposalWithRelations): string {
  const doc = generateProposalPDF(proposal)
  return doc.output('datauristring')
}

/**
 * Generate PDF as Blob for upload
 */
export function generateProposalPDFBlob(proposal: ProposalWithRelations): Blob {
  const doc = generateProposalPDF(proposal)
  return doc.output('blob')
}
