'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  ChevronDown,
  Edit,
  Target,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
// useToast is no longer used here — the two dialogs that emitted toasts
// own their own toast calls. Kept the import list tidy as a result.
import EditCustomerModal from './edit-customer-modal'
import DeleteCustomerDialog from './delete-customer-dialog'
import CustomerActivityFeed from './customer-activity-feed'
import CustomerJobsList from './customer-jobs-list'
import { CustomerDetailSidebar } from './customer-detail-sidebar'
import { CustomerDetailOverview } from './customer-detail-overview'
import { LogCallDialog, FollowUpDialog } from './customer-detail-dialogs'
import { useUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import { CUSTOMER_STATUS_OPTIONS } from '@/lib/validations/customer'
import { createClient } from '@/lib/supabase/client'
import type { Customer, CustomerStatus } from '@/types/database'

interface CustomerWithJoins extends Customer {
  account_owner?: {
    id: string
    first_name?: string
    last_name?: string
    full_name?: string
  } | null
}

interface CustomerDetailProps {
  customer: CustomerWithJoins
}

/**
 * Contact detail page shell. Orchestrates the sidebar, tabbed main area,
 * and the various modals — but the actual rendering of each region is
 * delegated to sibling components so this file stays scannable.
 *
 * Tab contents live in:
 *   - CustomerDetailOverview (notes, key dates, lead source, surveys)
 *   - CustomerActivityFeed (activity timeline)
 *   - CustomerJobsList (jobs tab)
 * The Opportunities tab is still a placeholder until we wire it up.
 */
export default function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLogCallDialog, setShowLogCallDialog] = useState(false)
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'activity' | 'opportunities' | 'jobs'
  >('overview')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const updateStatusMutation = useUpdateCustomerStatus()

  // Walk the survey → estimate → job chain so the sidebar can surface
  // the right "next step" CTA and the overview can show a progress strip.
  const { data: workflow } = useQuery({
    queryKey: ['customer-workflow', customer.id],
    queryFn: async () => {
      const supabase = createClient()

      const { data: surveys } = await supabase
        .from('site_surveys')
        .select('id')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
      const surveyId = surveys?.[0]?.id || null

      let estimateId: string | null = null
      if (surveyId) {
        const { data: estimates } = await supabase
          .from('estimates')
          .select('id')
          .eq('site_survey_id', surveyId)
          .order('created_at', { ascending: false })
          .limit(1)
        estimateId = estimates?.[0]?.id || null
      }

      let jobId: string | null = null
      if (estimateId) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('estimate_id', estimateId)
          .limit(1)
        jobId = jobs?.[0]?.id || null
      }

      return { surveyId, estimateId, jobId }
    },
    enabled: !!customer.id,
    staleTime: 60000,
  })

  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    if (newStatus === customer.status) return
    setIsUpdatingStatus(true)
    try {
      await updateStatusMutation.mutateAsync({ id: customer.id, status: newStatus })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', count: undefined as number | undefined },
    { id: 'activity' as const, label: 'Activity', count: undefined as number | undefined },
    {
      id: 'opportunities' as const,
      label: 'Opportunities',
      count: undefined as number | undefined,
    },
    { id: 'jobs' as const, label: 'Jobs', count: (customer.total_jobs || 0) as number | undefined },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/crm/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUpdatingStatus}>
                Status <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={opt.value === customer.status}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <CustomerDetailSidebar
          customer={customer}
          displayName={displayName}
          workflow={workflow}
          onLogCallClick={() => setShowLogCallDialog(true)}
          onFollowUpClick={() => setShowFollowUpDialog(true)}
        />

        {/* Right Main Content — Tabbed */}
        <div className="space-y-4">
          <div className="flex space-x-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <CustomerDetailOverview
              customer={customer}
              displayName={displayName}
              workflow={workflow}
            />
          )}

          {activeTab === 'activity' && <CustomerActivityFeed customer={customer} />}

          {activeTab === 'opportunities' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Opportunities linked to this contact will appear here
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'jobs' && <CustomerJobsList customer={customer} />}
        </div>
      </div>

      <EditCustomerModal
        customer={customer}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
      <DeleteCustomerDialog
        customer={customer}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={() => {
          setShowDeleteDialog(false)
          router.push('/crm/contacts')
        }}
      />
      <LogCallDialog
        customerId={customer.id}
        displayName={displayName}
        open={showLogCallDialog}
        onOpenChange={setShowLogCallDialog}
      />
      <FollowUpDialog
        customer={customer}
        open={showFollowUpDialog}
        onOpenChange={setShowFollowUpDialog}
      />
    </div>
  )
}
