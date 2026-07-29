'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ProposalWithRelations } from '@/types/estimates'
import { CustomerDocument } from '@/components/proposals/customer-document'


export default function ProposalPortalPage() {
  const params = useParams()
  const token = params.token as string

  const [proposal, setProposal] = useState<ProposalWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  // Signature form state
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const loadProposal = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/portal/proposal/${token}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load proposal')
      }

      const data = await response.json()
      setProposal(data.proposal)

      if (data.proposal.status === 'signed') {
        setSigned(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadProposal()
  }, [loadProposal])

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x: number, y: number

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x: number, y: number

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
      e.preventDefault()
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSign = async () => {
    if (!signerName || !signerEmail || !hasSignature) return

    const canvas = canvasRef.current
    if (!canvas) return

    setSigning(true)

    try {
      const signatureData = canvas.toDataURL('image/png')

      const response = await fetch('/api/proposals/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: token,
          signer_name: signerName,
          signer_email: signerEmail,
          signature_data: signatureData,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sign proposal')
      }

      setSigned(true)
      setShowSignDialog(false)
      loadProposal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign proposal')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading proposal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Error Loading Proposal</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!proposal || !proposal.estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Proposal Not Found</h1>
            <p className="text-muted-foreground">This proposal may have expired or been removed.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estimate = proposal.estimate
  const customer = proposal.customer
  const organization = proposal.organization


  return (
    <>
      <CustomerDocument
        estimate={estimate}
        proposal={proposal}
        customer={customer}
        organizationName={organization?.name}
        signed={signed}
        footer={
          !signed ? (
            <div className="sticky bottom-0 bg-white border-t p-4 -mx-4">
              <div className="max-w-4xl mx-auto">
                <Button
                  onClick={() => setShowSignDialog(true)}
                  className="w-full md:w-auto"
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Accept &amp; Sign Proposal
                </Button>
              </div>
            </div>
          ) : null
        }
      />


      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Proposal</DialogTitle>
            <DialogDescription>
              By signing below, you agree to the terms and pricing outlined in this proposal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signer-name">Your Name</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signer-email">Your Email</Label>
              <Input
                id="signer-email"
                type="email"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Signature</Label>
                <Button variant="ghost" size="sm" onClick={clearSignature}>
                  Clear
                </Button>
              </div>
              <div className="border rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={150}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Draw your signature above using your mouse or finger
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={!signerName || !signerEmail || !hasSignature || signing}
            >
              {signing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
