import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, KeyRound, Smartphone, Monitor } from 'lucide-react'
import { ChangePasswordForm } from '@/components/settings/change-password-form'
import { Badge } from '@/components/ui/badge'

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Security
        </h2>
        <p className="text-muted-foreground">
          Manage your account security settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* 2FA and session management are described on the Settings index
          but not yet implemented. Rendering placeholder cards so the page
          matches what was promised and it's clear these are planned, rather
          than presenting a one-feature page where the index advertised three. */}
      <Card className="opacity-80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Two-factor authentication
            </CardTitle>
            <Badge variant="secondary">Coming soon</Badge>
          </div>
          <CardDescription>
            Add a second step to sign in using an authenticator app or SMS code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Once available, you&apos;ll be able to enroll a TOTP app (1Password, Authy, Google
            Authenticator) and download recovery codes from here.
          </p>
        </CardContent>
      </Card>

      <Card className="opacity-80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active sessions
            </CardTitle>
            <Badge variant="secondary">Coming soon</Badge>
          </div>
          <CardDescription>
            See every device you&apos;re signed in on and sign out of any you don&apos;t recognize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            In the meantime, changing your password above invalidates all other active sessions
            across your devices.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
