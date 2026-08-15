import { ActivityVocabularyManager } from './activity-vocabulary-manager'

export const metadata = { title: 'Activity Types & Outcomes' }

/**
 * The vocabulary automations reference.
 *
 * Every rule and process step picks an activity type or outcome by id. Until
 * this page existed, changing that vocabulary meant editing rows by hand in
 * SQL — see docs/marketsharp-hazardos-diff.md.
 */
export default function ActivityVocabularyPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Types &amp; Outcomes</h1>
        <p className="text-muted-foreground">
          The words your team uses for what a step is and how it turned out. Automations under
          Settings → Automations pick from this list.
        </p>
      </div>
      <ActivityVocabularyManager />
    </div>
  )
}
