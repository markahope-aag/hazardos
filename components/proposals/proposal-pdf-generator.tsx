'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { generatePDFAsync } from '@/components/pdf/pdf-lazy'

interface ProposalPDFGeneratorProps {
  estimateId: string
  jobName: string
  customerName: string
  totalPrice: number
}

export default function ProposalPDFGenerator({
  estimateId,
  jobName: _jobName,
  customerName,
  totalPrice: _totalPrice,
}: ProposalPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true)

      // Lazy load PDF libraries only when needed
      const { jsPDF } = await generatePDFAsync()
      
      if (!jsPDF) {
        throw new Error('PDF library not available')
      }

      // Generate PDF using the existing service
      await import('@/lib/services/proposal-pdf-generator')
      
      // Fetch proposal data
      const response = await fetch(`/api/proposals/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimateId,
          customTerms: {
            paymentTerms: 'Net 30',
            exclusions: [
              'Clearance air testing (available as add-on)',
              'Repair or replacement of removed materials',
              'Permits and inspection fees',
              'Work outside normal business hours',
            ],
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate proposal')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proposal-${customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: 'Proposal PDF generated successfully',
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate proposal PDF',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      className="w-full"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Generate Proposal PDF
        </>
      )}
    </Button>
  )
}