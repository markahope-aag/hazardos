import { WorkQueue } from './work-queue'

export const metadata = {
  title: 'My Work',
}

/**
 * The daily list: everything assigned to one person across contacts, jobs,
 * surveys, estimates and invoices, in due-date order.
 *
 * The per-entity follow-up panels answer "what is outstanding on this job".
 * This answers "what am I doing today", which is the question the office asks
 * far more often. See docs/marketsharp-hazardos-diff.md.
 */
export default function MyWorkPage() {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Work</h1>
        <p className="text-muted-foreground">
          Calls, emails, texts and to-dos due across every job and contact, oldest first.
        </p>
      </div>
      <WorkQueue />
    </div>
  )
}
