import Link from 'next/link'

/**
 * Root 404. Without this Next serves its own unstyled default, which looks like
 * a broken deployment rather than a wrong address.
 *
 * The link goes to `/` rather than a dashboard route on purpose: an
 * unauthenticated visitor who mistypes a URL should land on the sign-in page,
 * not be bounced through a redirect they cannot satisfy.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The link may be out of date, or the page may have been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go back
        </Link>
      </div>
    </div>
  )
}
