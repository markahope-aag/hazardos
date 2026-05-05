'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{firstName?: string; lastName?: string; email?: string; password?: string; confirmPassword?: string}>({})

  const inviteToken = searchParams.get('invite')

  // Check if Supabase is configured
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200">
          <p className="text-sm">
            <strong>Setup Required:</strong> Supabase environment variables are not configured.
            Please add your Supabase credentials to continue.
          </p>
        </div>
      </div>
    )
  }

  const supabase = createClient()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setErrors({}) // Clear previous errors

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string

    // Validate form fields
    const newErrors: {firstName?: string; lastName?: string; email?: string; password?: string; confirmPassword?: string} = {}
    if (!firstName) newErrors.firstName = 'First name is required'
    if (!lastName) newErrors.lastName = 'Last name is required'
    if (!email) newErrors.email = 'Email is required'
    if (!password) newErrors.password = 'Password is required'
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            ...(inviteToken ? { invite_token: inviteToken } : {}),
          },
          // Auth callback checks if user has an org and routes accordingly
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      if (data.user && !data.session) {
        // Email confirmation required
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please check your email to verify your account.',
        })
        router.push('/login?message=Check your email to verify your account')
      } else if (data.session) {
        // Auto-confirmed — check if the invite trigger already set up the org
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', data.user!.id)
          .single()

        if (profile?.organization_id) {
          // Invited user — org already assigned by trigger
          toast({
            title: 'Account created',
            description: 'Welcome to the team!',
          })
          router.push('/')
        } else {
          // New user — needs to set up org
          toast({
            title: 'Account created',
            description: 'Welcome! Let\'s set up your organization.',
          })
          router.push('/onboard')
        }
        router.refresh()
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {inviteToken && (
        <div className="p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
          <p className="text-sm">
            You&apos;ve been invited to join a team. Create your account to get started.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First Name" required error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="John"
            required
            disabled={isLoading}
          />
        </FormField>
        <FormField label="Last Name" required error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            required
            disabled={isLoading}
          />
        </FormField>
      </div>
      <FormField label="Email" required error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          disabled={isLoading}
        />
      </FormField>
      <FormField
        label="Password"
        required
        error={errors.password}
        hint="Must be at least 8 characters"
      >
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isLoading}
        />
      </FormField>
      <FormField label="Confirm Password" required error={errors.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isLoading}
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  )
}
