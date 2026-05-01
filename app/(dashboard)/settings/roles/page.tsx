import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Lock } from 'lucide-react'
import { ROLE_CAPABILITIES } from '@/lib/auth/capabilities'

export const metadata = {
  title: 'Roles & Permissions',
}

export default async function RolesPage() {
  // Roles management is admin-only. Field staff and viewers shouldn't see
  // the matrix because it doubles as documentation of who-can-do-what.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const adminRoles = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin']
  if (!profile?.role || !adminRoles.includes(profile.role)) {
    redirect('/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
        <p className="text-muted-foreground">
          What each role can do in HazardOS. Assign roles in{' '}
          <a href="/settings/team" className="underline underline-offset-2 hover:text-foreground">
            Team Members
          </a>
          .
        </p>
      </div>

      <Card className="bg-muted/40">
        <CardContent className="flex items-start gap-3 py-4">
          <Lock className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Capabilities are currently fixed.
            </p>
            <p>
              Per-organization customization (turning individual capabilities on
              or off for a role) is on the roadmap. For now these five roles
              cover the common patterns we&apos;ve seen with abatement teams.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {ROLE_CAPABILITIES.map((role) => (
          <Card key={role.role}>
            <CardHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-lg">{role.label}</CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {role.role}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                {role.shortDescription}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-medium text-foreground">Intended for: </span>
                {role.intendedFor}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {role.groups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {role.cannotDo.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cannot do
                  </h3>
                  <ul className="space-y-1.5">
                    {role.cannotDo.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <X className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
