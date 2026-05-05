'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export function ForgotPasswordForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      setIsLoading(false)
      return
    }

    try {
      // Hits our own endpoint so the email comes from HazardOS via
      // Resend (branded), not Supabase's default unbranded template.
      // The endpoint always returns 200 — anti-enumeration — so the
      // UI shows the same confirmation regardless of whether the
      // address has an account.
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        toast({
          title: 'Error',
          description: 'Could not send reset email. Please try again.',
          variant: 'destructive',
        })
      } else {
        setSubmitted(true)
        toast({
          title: 'Check your email',
          description: 'If that address has an account, a reset link is on its way.',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          If that email address is associated with a HazardOS account, you&apos;ll receive a reset link shortly. If you don&apos;t see it within a few minutes, check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending link...
          </>
        ) : (
          'Send reset link'
        )}
      </Button>
    </form>
  )
}
