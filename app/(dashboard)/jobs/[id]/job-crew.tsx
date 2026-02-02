'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPlus, UserMinus, Crown, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { crewRoleConfig } from '@/types/jobs'

interface CrewMember {
  id: string
  profile_id: string
  role: string
  is_lead: boolean
  hours_worked: number | null
  clock_in_at: string | null
  clock_out_at: string | null
  profile?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
}

interface AvailableCrew {
  id: string
  full_name: string
  email: string
  role: string
}

interface JobCrewProps {
  job: {
    id: string
    job_number?: string
    status?: string
  }
  crew?: CrewMember[]
  availableCrew?: AvailableCrew[]
}

export function JobCrew({ job, crew = [], availableCrew = [] }: JobCrewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null)

  const [assignForm, setAssignForm] = useState({
    profile_id: '',
    role: 'worker',
    is_lead: false,
  })

  const assignedProfileIds = crew.map(c => c.profile_id)
  const unassignedCrew = availableCrew.filter(c => !assignedProfileIds.includes(c.id))

  const handleAssign = async () => {
    if (!assignForm.profile_id) {
      toast({ title: 'Error', description: 'Please select a crew member', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/crew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to assign crew member')
      }

      toast({ title: 'Success', description: 'Crew member assigned to job' })
      setShowAssignDialog(false)
      setAssignForm({ profile_id: '', role: 'worker', is_lead: false })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign crew member',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedMember) return

    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/crew?crew_id=${selectedMember.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove crew member')
      }

      toast({ title: 'Success', description: 'Crew member removed from job' })
      setShowRemoveDialog(false)
      setSelectedMember(null)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove crew member',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canModifyCrew = job.status === 'scheduled' || job.status === 'in_progress'

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assigned Crew</CardTitle>
          {canModifyCrew && unassignedCrew.length > 0 && (
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Crew
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Crew Member</DialogTitle>
                  <DialogDescription>
                    Add a crew member to this job.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Crew Member</Label>
                    <Select
                      value={assignForm.profile_id}
                      onValueChange={(value) => setAssignForm(prev => ({ ...prev, profile_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select crew member" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedCrew.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={assignForm.role}
                      onValueChange={(value) => setAssignForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(crewRoleConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_lead"
                      checked={assignForm.is_lead}
                      onCheckedChange={(checked) => setAssignForm(prev => ({ ...prev, is_lead: !!checked }))}
                    />
                    <Label htmlFor="is_lead">Designate as crew lead</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {crew.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No crew members assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {crew.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {member.profile?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.profile?.full_name || 'Unknown'}
                        </span>
                        {member.is_lead && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={cn(
                            crewRoleConfig[member.role as keyof typeof crewRoleConfig]?.bgColor,
                            crewRoleConfig[member.role as keyof typeof crewRoleConfig]?.color
                          )}
                        >
                          {crewRoleConfig[member.role as keyof typeof crewRoleConfig]?.label || member.role}
                        </Badge>
                        {member.hours_worked !== null && (
                          <span>{member.hours_worked}h worked</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canModifyCrew && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedMember(member)
                        setShowRemoveDialog(true)
                      }}
                      aria-label="Remove crew member"
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Crew Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.profile?.full_name} from this job?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
