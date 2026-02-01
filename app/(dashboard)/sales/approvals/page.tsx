import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClipboardCheck, Clock, CheckCircle, XCircle } from 'lucide-react'
import { ApprovalActions } from '@/components/sales/approval-actions'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
    case 'approved':
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
    case 'rejected':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getEntityTypeBadge(type: string) {
  switch (type) {
    case 'estimate':
      return <Badge variant="outline">Estimate</Badge>
    case 'discount':
      return <Badge variant="outline">Discount</Badge>
    case 'proposal':
      return <Badge variant="outline">Proposal</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [pendingRequests, allRequests] = await Promise.all([
    ApprovalService.getMyPendingApprovals(),
    ApprovalService.getRequests(),
  ])

  const pendingCount = pendingRequests.length
  const approvedCount = allRequests.filter(r => r.final_status === 'approved').length
  const rejectedCount = allRequests.filter(r => r.final_status === 'rejected').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground">
          Review and approve estimates, discounts, and proposals
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Total approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Total rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Level 1</TableHead>
                  <TableHead>Level 2</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>{getEntityTypeBadge(request.entity_type)}</TableCell>
                    <TableCell>{request.requester?.full_name || 'Unknown'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {request.amount ? formatCurrency(request.amount) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.level1_status)}</TableCell>
                    <TableCell>
                      {request.requires_level2 ? (
                        getStatusBadge(request.level2_status || 'pending')
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ApprovalActions request={request} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          {allRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approval requests yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>{getEntityTypeBadge(request.entity_type)}</TableCell>
                    <TableCell>{request.requester?.full_name || 'Unknown'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {request.amount ? formatCurrency(request.amount) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.final_status)}</TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
