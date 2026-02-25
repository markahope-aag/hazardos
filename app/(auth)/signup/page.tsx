import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign Up - HazardOS',
  description: 'Create your HazardOS account',
}

export default function SignupPage() {
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
