import { AutomationsList } from './automations-list'
import { TriggersList } from './triggers-list'

export const metadata = { title: 'Automations' }

/**
 * Automation chains: an ordered set of follow-up work that runs itself when
 * something happens.
 *
 * See docs/marketsharp-hazardos-diff.md. This is the configuration surface for
 * the engine, and the reason it exists is the tiering rule: a chain is one
 * tenant's business process, so it has to be theirs to build and change rather
 * than something we deploy for them.
 */
export default function AutomationsSettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
        <p className="text-muted-foreground">
          A chain is a list of follow-up steps that gets created for you when something
          happens: a call to make, an email to send, a job to check on. Build the chain
          once and it runs every time.
        </p>
      </div>
      <AutomationsList />

      {/* Triggers live on the same page because one is useless without the
          other: a chain nobody starts never runs, and a trigger pointing at
          nothing does nothing. Splitting them across two screens hides that. */}
      <TriggersList />
    </div>
  )
}
