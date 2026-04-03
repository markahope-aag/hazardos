import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign Up - HazardOS',
  description: 'Create your HazardOS account',
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  // If there's an invite token and a logged-in user, sign them out server-side
  if (invite) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.auth.signOut()
      // Redirect back to this page so the browser gets fresh cookies (no session)
      redirect(`/signup?invite=${invite}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-gray-600">
          Start your 14-day free trial. No credit card required.
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
      <div className="space-y-4">
        <p className="text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="hover:text-primary underline underline-offset-4"
          >
            Already have an account? Sign In
          </Link>
        </p>
        <p className="text-center text-xs text-gray-500">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
