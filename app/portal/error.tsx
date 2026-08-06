'use client'

/**
 * The portal is the only part of the app seen by people who are not customers of
 * ours: it is where a remediation company's own client opens a proposal or an
 * invoice from a link in an email.
 *
 * So this deliberately does NOT reuse the dashboard error boundary. That one
 * shows a stack digest and offers navigation into an app this visitor has no
 * account for. Here the visitor can do exactly two useful things — try again, or
 * contact the company that sent the link — so those are the only options given.
 */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">This page didn&apos;t load</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something went wrong on our side. Your document is safe and nothing you
          did caused this.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <p className="mt-6 text-xs text-muted-foreground">
          If it keeps happening, reply to the email this link came from and the
          company will send you a new one.
        </p>
      </div>
    </div>
  )
}
