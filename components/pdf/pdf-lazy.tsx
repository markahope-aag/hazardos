'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Loader2, FileText } from 'lucide-react'

// Loading state for PDF operations
function PDFLoadingState({ action = 'Generating' }: { action?: string }) {
  return (
    <Button disabled className="w-full">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {action} PDF...
    </Button>
  )
}

// Error state for PDF operations
function PDFErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="text-center p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <FileText className="mx-auto h-8 w-8 text-destructive mb-2" />
      <p className="text-sm text-destructive mb-2">{error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}

// Lazy load PDF generation components to reduce bundle size
export const ProposalPDFGenerator = dynamic(
  () => import('@/components/proposals/proposal-pdf-generator'),
  {
    ssr: false,
    loading: () => <PDFLoadingState action="Loading PDF Generator" />,
  }
)

export const InvoicePDFGenerator = dynamic(
  () => import('@/components/invoices/invoice-pdf-generator'),
  {
    ssr: false,
    loading: () => <PDFLoadingState action="Loading Invoice Generator" />,
  }
)

export const ReportPDFExporter = dynamic(
  () => import('@/components/reports/report-pdf-exporter'),
  {
    ssr: false,
    loading: () => <PDFLoadingState action="Loading Report Exporter" />,
  }
)

// Lazy load PDF libraries themselves
export const generatePDFAsync = async () => {
  const [jsPDF, reactPDF] = await Promise.all([
    import('jspdf'),
    import('@react-pdf/renderer').catch(() => null),
  ])
  
  return {
    jsPDF: jsPDF.default,
    reactPDF,
  }
}

export { PDFLoadingState, PDFErrorState }