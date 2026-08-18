'use client'

import { useState, useEffect } from 'react'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { UserPlus, UserMinus, Crown, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { crewRoleConfig } from '@/types/jobs'
import {
  useJobCompliance,
  fetchWorkerJobCheck,
  type AssignmentCheckDTO,
} from '@/lib/hooks/use-credentials'
import { CrewReadinessBadge } from '@/components/compliance/credential-status-badge'

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

  // Multi-select crew assignment: users can check off several people,
  // pick a shared role, and name one supervisor. The supervisor list is
  // not limited to the checked members: crews occasionally put someone in
  // charge who isn't on the crew sheet, and on mold work they sometimes
  // name someone who isn't formally a supervisor at all.
  // `lead_profile_id` keeps its name because it maps to job_crew.is_lead.
  const [assignForm, setAssignForm] = useState<{
    profile_ids: string[]
    role: string
    lead_profile_id: string
  }>({
    profile_ids: [],
    // 'crew', not 'worker'. crewRoleSchema accepts lead | crew | supervisor |
    // trainee, so the old 'worker' default was rejected by the API for every
    // member the user did not manually re-role, and it matched no SelectItem
    // so the Role trigger rendered blank. Found by the E2E pass on 2026-08-18.
    role: 'crew',
    lead_profile_id: '',
  })

  // Credential compliance for the assignment gate.
  const { data: compliance } = useJobCompliance(job.id)
  const [workerChecks, setWorkerChecks] = useState<Record<string, AssignmentCheckDTO>>({})

  const assignedProfileIds = crew.map(c => c.profile_id)
  const unassignedCrew = availableCrew.filter(c => !assignedProfileIds.includes(c.id))

  // Supervisor candidates: everyone not already on the job, with the
  // people checked off for this assignment floated to the top so the
  // usual pick is the first one in the list.
  const selectedForSupervisor = unassignedCrew.filter(c =>
    assignForm.profile_ids.includes(c.id),
  )
  const otherForSupervisor = unassignedCrew.filter(
    c => !assignForm.profile_ids.includes(c.id),
  )
  const assignCount =
    assignForm.lead_profile_id &&
    !assignForm.profile_ids.includes(assignForm.lead_profile_id)
      ? assignForm.profile_ids.length + 1
      : assignForm.profile_ids.length

  // Fetch each selected worker's job-compliance check to warn before assigning.
  useEffect(() => {
    let cancelled = false
    const missing = assignForm.profile_ids.filter((id) => !workerChecks[id])
    if (missing.length === 0) return
    Promise.all(
      missing.map((id) =>
        fetchWorkerJobCheck(job.id, id)
          .then((c) => [id, c] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return
      setWorkerChecks((prev) => {
        const next = { ...prev }
        for (const r of results) if (r) next[r[0]] = r[1]
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // workerChecks intentionally omitted: we only fetch newly-selected workers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignForm.profile_ids, job.id])

  const toggleMemberSelected = (id: string) => {
    setAssignForm(prev => {
      const has = prev.profile_ids.includes(id)
      const next = has
        ? prev.profile_ids.filter(x => x !== id)
        : [...prev.profile_ids, id]
      return {
        ...prev,
        profile_ids: next,
        // If the user drops the member who was flagged lead, clear it.
        lead_profile_id: has && prev.lead_profile_id === id ? '' : prev.lead_profile_id,
      }
    })
  }

  const handleAssign = async () => {
    if (assignForm.profile_ids.length === 0 && !assignForm.lead_profile_id) {
      toast({ title: 'Error', description: 'Select at least one crew member', variant: 'destructive' })
      return
    }

    setLoading(true)
    // A supervisor picked from outside the checked list still has to be
    // assigned to the job, otherwise the designation lands on nobody.
    const supervisorId = assignForm.lead_profile_id
    const profileIds =
      supervisorId && !assignForm.profile_ids.includes(supervisorId)
        ? [...assignForm.profile_ids, supervisorId]
        : assignForm.profile_ids

    try {
      const results = await Promise.allSettled(
        profileIds.map((profileId) =>
          fetch(`/api/jobs/${job.id}/crew`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile_id: profileId,
              // Whoever is named supervisor carries the supervisor role,
              // so the badge on the crew list matches the designation.
              role: profileId === supervisorId ? 'supervisor' : assignForm.role,
              is_lead: profileId === supervisorId,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body?.error || body?.message || 'Failed')
            }
            return res.json()
          }),
        ),
      )

      const failed = results.filter((r) => r.status === 'rejected')
      const succeeded = results.length - failed.length

      if (failed.length === 0) {
        toast({
          title:
            succeeded === 1
              ? 'Crew member assigned'
              : `${succeeded} crew members assigned`,
        })
      } else if (succeeded > 0) {
        toast({
          title: `${succeeded} assigned, ${failed.length} failed`,
          description:
            (failed[0] as PromiseRejectedResult).reason?.message ||
            'Retry the failed members from the dialog.',
          variant: 'destructive',
        })
      } else {
        throw (failed[0] as PromiseRejectedResult).reason
      }

      setShowAssignDialog(false)
      setAssignForm({ profile_ids: [], role: 'worker', lead_profile_id: '' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign crew',
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
          <div className="flex items-center gap-2">
            <CardTitle>Assigned Crew</CardTitle>
            {compliance && crew.length > 0 && (
              <CrewReadinessBadge readiness={compliance.overall} />
            )}
          </div>
          {canModifyCrew && unassignedCrew.length > 0 && (
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Crew
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Assign Crew</DialogTitle>
                  <DialogDescription>
                    Pick one or more team members. All selected members get the
                    same role. Name a supervisor from anyone on the team and
                    they get added to the job if they are not already checked
                    off above.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label id="crew-members-label">Crew Members</Label>
                    <div
                      role="group"
                      aria-labelledby="crew-members-label"
                      className="max-h-64 overflow-y-auto rounded-md border divide-y"
                    >
                      {unassignedCrew.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Everyone on the team is already assigned.
                        </p>
                      ) : (
                        unassignedCrew.map((member) => {
                          const checked = assignForm.profile_ids.includes(member.id)
                          return (
                            <label
                              key={member.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleMemberSelected(member.id)}
                              />
                              <span className="text-sm">{member.full_name}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                    {assignForm.profile_ids.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {assignForm.profile_ids.length} selected
                      </p>
                    )}
                    {assignForm.profile_ids.map((id) => {
                      const check = workerChecks[id]
                      if (!check) return null
                      const issues = check.requirements.filter((r) => r.state !== 'valid')
                      if (issues.length === 0) return null
                      const blocked =
                        check.enforcement === 'block' &&
                        issues.some((r) => r.state === 'missing' || r.state === 'expired')
                      return (
                        <div
                          key={id}
                          className={cn(
                            'rounded-md border p-2 text-xs',
                            blocked
                              ? 'border-red-200 bg-red-50 text-red-800'
                              : 'border-amber-200 bg-amber-50 text-amber-800',
                          )}
                        >
                          <div className="flex items-center gap-1 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {check.worker_name ?? 'Worker'} —{' '}
                            {blocked ? 'assignment will be blocked' : 'missing/expiring credentials'}
                          </div>
                          <ul className="mt-1 list-disc pl-5">
                            {issues.map((r) => (
                              <li key={r.credential_type_id}>
                                {r.name} — {r.state.replace('_', ' ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-applies-to-all-selected">Role (applies to all selected)</Label>
                    <Select
                      value={assignForm.role}
                      onValueChange={(value) => setAssignForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger id="role-applies-to-all-selected">
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
                  <div className="space-y-2">
                    <Label htmlFor="job-supervisor">Supervisor (optional)</Label>
                    <Select
                      value={assignForm.lead_profile_id}
                      onValueChange={(value) =>
                        setAssignForm(prev => ({
                          ...prev,
                          lead_profile_id: value === '__none__' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id="job-supervisor">
                        <SelectValue placeholder="No supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No supervisor</SelectItem>
                        {selectedForSupervisor.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Selected for this job</SelectLabel>
                            {selectedForSupervisor.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.full_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {otherForSupervisor.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Anyone else on the team</SelectLabel>
                            {otherForSupervisor.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.full_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssign}
                    disabled={
                      loading ||
                      (assignForm.profile_ids.length === 0 && !assignForm.lead_profile_id)
                    }
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Assign {assignCount > 1 ? `${assignCount} Members` : 'Crew'}
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
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            Supervisor
                          </span>
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
