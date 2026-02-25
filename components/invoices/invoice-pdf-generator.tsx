'use client'

import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface InvoicePDFGeneratorProps {
  invoiceId?: string
  onGenerated?: () => void
}

export default function InvoicePDFGenerator({ invoiceId, onGenerated }: InvoicePDFGeneratorProps) {
  const handleGenerate = () => {
    // TODO: Implement invoice PDF generation
    void invoiceId
    onGenerated?.()
  }

  return (
    <Button onClick={handleGenerate} variant="outline">
      <FileText className="mr-2 h-4 w-4" />
      Generate Invoice PDF
    </Button>
  )
}
