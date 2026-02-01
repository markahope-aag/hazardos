'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

interface ProposalGeneratorProps {
  estimateId: string
  jobName: string
  customerName: string
  totalPrice: number
}

export function ProposalGenerator({
  estimateId,
  jobName,
  customerName,
  totalPrice,
}: ProposalGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleGenerateProposal = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimateId,
          customTerms: {
            validDays: 30,
            paymentTerms: '50% deposit upon acceptance, balance due upon completion.',
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate proposal')
      }

      // Get the PDF blob
      const blob = await response.blob()

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `proposal-${jobName.replace(/\s+/g, '-')}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Proposal Generated',
        description: `PDF downloaded: ${filename}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate proposal',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Proposal
        </CardTitle>
        <CardDescription>
          Create a professional PDF proposal for this estimate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Job:</span>
              <p className="font-medium">{jobName}</p>
            </div>
            <div>
              <span className="text-gray-500">Customer:</span>
              <p className="font-medium">{customerName}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Total Price:</span>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalPrice)}
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerateProposal}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Proposal PDF
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            The proposal will include company branding, cost breakdown, scope of work, and terms.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
