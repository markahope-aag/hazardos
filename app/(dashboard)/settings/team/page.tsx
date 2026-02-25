'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InviteMemberDialog } from '@/components/settings/invite-member-dialog'
import { TeamMemberList } from '@/components/settings/team-member-list'
import { PendingInvitations } from '@/components/settings/pending-invitations'

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
  last_sign_in_at: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  invited_by: string
  expires_at: string
  created_at: string
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      setIsAdmin(profile.role === 'admin' || profile.role === 'tenant_owner')

      // Fetch team members
      const { data: membersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, last_sign_in_at')
        .eq('organization_id', profile.organization_id)
        .order('full_name')

      setMembers(membersData || [])

      // Fetch pending invitations (only if admin)
      if (profile.role === 'admin' || profile.role === 'tenant_owner') {
        const res = await fetch('/api/invitations')
        if (res.ok) {
          const data = await res.json()
          setInvitations(data.invitations || [])
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-muted-foreground">
            Manage your team members and invitations.
          </p>
        </div>
        {isAdmin && <InviteMemberDialog onInviteSent={loadData} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            People who are part of your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMemberList members={members} />
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that have been sent but not yet accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitations invitations={invitations} onRevoked={loadData} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
