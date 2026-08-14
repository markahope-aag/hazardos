import { EmailTemplatesManager } from './email-templates-manager'

export const metadata = { title: 'Message Templates' }

/**
 * The copy that automations send.
 *
 * Separate from Settings > Email, which configures the sending domain and
 * sender identity. That is plumbing; this is words a customer reads.
 */
export default function MessageTemplatesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
        <p className="text-muted-foreground">
          The emails your automations send. Write them once in your own words, then
          attach one to any step that sends an email.
        </p>
      </div>
      <EmailTemplatesManager />
    </div>
  )
}
