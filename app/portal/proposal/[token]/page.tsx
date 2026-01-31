'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Building2,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ProposalWithRelations, EstimateLineItem, LineItemType } from '@/types/estimates'

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
      console.error('Error loading proposal:', err)
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
      console.error('Error signing proposal:', err)
      alert(err instanceof Error ? err.message : 'Failed to sign proposal')
    } finally {
      setSigning(false)
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0)
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

  // Group line items by type
  const groupedLineItems = estimate.line_items?.reduce((acc, item) => {
    const type = item.item_type
    if (!acc[type]) acc[type] = []
    if (item.is_included) acc[type].push(item)
    return acc
  }, {} as Record<LineItemType, EstimateLineItem[]>) || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {organization?.name && (
                <h1 className="text-xl font-bold">{organization.name}</h1>
              )}
              <p className="text-sm text-muted-foreground">
                Proposal {proposal.proposal_number}
              </p>
            </div>
            {signed ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="h-4 w-4 mr-1" />
                Signed
              </Badge>
            ) : (
              <Badge variant="outline">
                {proposal.status === 'viewed' ? 'Viewed' : 'Awaiting Signature'}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Success message */}
        {signed && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-800">Proposal Signed Successfully</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Thank you for accepting this proposal. We will be in touch shortly to schedule your project.
                  </p>
                  {proposal.signed_at && (
                    <p className="text-xs text-green-600 mt-2">
                      Signed on {new Date(proposal.signed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cover Letter */}
        {proposal.cover_letter && (
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap">{proposal.cover_letter}</p>
            </CardContent>
          </Card>
        )}

        {/* Project Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-medium">
                {customer?.company_name || `${customer?.first_name} ${customer?.last_name}`}
              </p>
              {customer?.email && (
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              )}
              {customer?.phone && (
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {estimate.site_survey && (
                <>
                  <p className="text-sm">{estimate.site_survey.site_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {estimate.site_survey.site_city}, {estimate.site_survey.site_state} {estimate.site_survey.site_zip}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scope of Work */}
        {estimate.scope_of_work && (
          <Card>
            <CardHeader>
              <CardTitle>Scope of Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{estimate.scope_of_work}</p>
            </CardContent>
          </Card>
        )}

        {/* Inclusions */}
        {proposal.inclusions && proposal.inclusions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s Included</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {proposal.inclusions.map((item, idx) => (
                  <li key={idx} className="text-sm">{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(Object.entries(groupedLineItems) as [LineItemType, EstimateLineItem[]][]).map(([type, items]) => (
              <div key={type}>
                <div className="px-6 py-2 bg-muted/50">
                  <h4 className="font-medium text-sm">{LINE_ITEM_TYPE_LABELS[type]}</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: EstimateLineItem) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}

            {/* Summary */}
            <div className="px-6 py-4 bg-muted/30">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(estimate.subtotal)}</span>
                </div>
                {estimate.markup_percent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>{formatCurrency(estimate.markup_amount)}</span>
                  </div>
                )}
                {estimate.tax_percent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(estimate.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(estimate.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {(estimate.estimated_duration_days || proposal.valid_until) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {estimate.estimated_duration_days && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Estimated Duration:</span>{' '}
                  {estimate.estimated_duration_days} days
                </p>
              )}
              {proposal.valid_until && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Proposal Valid Until:</span>{' '}
                  {new Date(proposal.valid_until).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Terms */}
        {proposal.payment_terms && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{proposal.payment_terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Exclusions */}
        {proposal.exclusions && proposal.exclusions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Exclusions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {proposal.exclusions.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Terms and Conditions */}
        {proposal.terms_and_conditions && (
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.terms_and_conditions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sign Button */}
        {!signed && (
          <div className="sticky bottom-0 bg-white border-t p-4 -mx-4">
            <div className="max-w-4xl mx-auto">
              <Button
                onClick={() => setShowSignDialog(true)}
                className="w-full md:w-auto"
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Accept & Sign Proposal
              </Button>
            </div>
          </div>
        )}
      </main>

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
    </div>
  )
}
