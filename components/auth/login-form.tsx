'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function LoginForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{email?: string; password?: string}>({})
  
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

    // Basic validation
    const newErrors: {email?: string; password?: string} = {}
    if (!email) newErrors.email = 'Email is required'
    if (!password) newErrors.password = 'Password is required'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      toast({
        title: 'Login Timeout',
        description: 'Login is taking too long. Please try again or check your connection.',
        variant: 'destructive',
      })
    }, 30000) // 30 second timeout

    try {
      console.log('🔐 Attempting login for:', email)
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      clearTimeout(timeoutId)

      if (error) {
        console.error('❌ Login error:', error)
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        console.log('✅ Login successful, redirecting...')
        toast({
          title: 'Login Successful',
          description: 'Redirecting to dashboard...',
        })
        
        // Small delay to show success message, then redirect
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Login exception:', error)
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
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
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
            {errors.email}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          disabled={isLoading}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive mt-1" role="alert">
            {errors.password}
          </p>
        )}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}