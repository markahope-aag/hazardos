import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, Building, Bell, Shield, Palette, Link2 } from 'lucide-react'
import Link from 'next/link'

const settingsGroups = [
  {
    title: 'Pricing',
    description: 'Labor rates, equipment costs, disposal fees, and markup settings',
    href: '/settings/pricing',
    icon: DollarSign,
  },
  {
    title: 'Integrations',
    description: 'Connect QuickBooks and other business tools',
    href: '/settings/integrations',
    icon: Link2,
  },
  {
    title: 'Team Members',
    description: 'Manage users, roles, and permissions',
    href: '/settings/team',
    icon: Users,
  },
  {
    title: 'Company Profile',
    description: 'Business information, logo, and contact details',
    href: '/settings/company',
    icon: Building,
  },
  {
    title: 'Notifications',
    description: 'Email alerts and reminder preferences',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Security',
    description: 'Password, two-factor authentication, and sessions',
    href: '/settings/security',
    icon: Shield,
  },
  {
    title: 'Appearance',
    description: 'Theme, branding, and display preferences',
    href: '/settings/appearance',
    icon: Palette,
  },
]

export default function SettingsPage() {
  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsGroups.map((group) => {
          const Icon = group.icon
          return (
            <Link key={group.href} href={group.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{group.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
