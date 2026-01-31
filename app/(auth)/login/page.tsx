import { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Login - HazardOS',
  description: 'Sign in to your HazardOS account',
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-gray-600">
          Enter your email to sign in to your account
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-gray-600">
        <Link
          href="/signup"
          className="hover:text-primary underline underline-offset-4"
        >
          Don't have an account? Sign Up
        </Link>
      </p>
    </div>
  )
}