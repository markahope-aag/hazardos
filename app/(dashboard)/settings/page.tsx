import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { SETTINGS_NAV } from '@/components/settings/settings-nav'
import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/auth/roles'
import { BookOpen, Download, ShieldCheck } from 'lucide-react'

// Landing page for /settings. The sidebar is the primary navigation;
// this page just gives a quick pointer into every section for users
// who land here without a subsection in mind.
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hidden = new Set<string>()
  let userRole: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role ?? null
    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('billing_managed_externally')
        .eq('id', profile.organization_id)
        .single()
      if (org?.billing_managed_externally) hidden = new Set(['/settings/billing'])
    }
  }

  const groups = SETTINGS_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (hidden.has(item.href)) return false
      if (!item.requiredRoles) return true
      if (!userRole) return false
      return item.requiredRoles.includes(userRole)
    }),
  })).filter((group) => group.items.length > 0)

  // The admin guide covers configuration, so it follows the same line as the
  // settings sections that configure things. Everyone gets the user guide.
  const canSeeAdminGuide = !!userRole && ROLES.TENANT_ADMIN.includes(userRole)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Where do you want to go?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick a section from the sidebar, or jump straight in.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guides
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Static PDFs under /public/guides, regenerated from the Markdown
              in docs/ by `npm run guides`. Plain anchors, not routes. */}
          <a href="/guides/hazardos-user-guide.pdf" download="HazardOS User Guide.pdf">
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">User Guide</div>
                  <div className="text-xs text-muted-foreground">
                    Day to day use, for everyone on the team
                  </div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </a>

          {canSeeAdminGuide && (
            <a href="/guides/hazardos-admin-guide.pdf" download="HazardOS Admin Guide.pdf">
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">Admin Guide</div>
                    <div className="text-xs text-muted-foreground">
                      Setting the system up and keeping it healthy
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </a>
          )}
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.label} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="h-full hover:border-primary/40 transition-colors">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{item.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
