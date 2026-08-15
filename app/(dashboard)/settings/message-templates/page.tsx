import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailTemplatesManager } from './email-templates-manager'
import { SmsTemplatesManager } from './sms-templates-manager'

export const metadata = { title: 'Message Templates' }

/**
 * The copy that automations send.
 *
 * Separate from Settings > Email, which configures the sending domain and
 * sender identity. That is plumbing; this is words a customer reads.
 *
 * Includes the six shipped-default reminders (job confirmation, the two
 * appointment texts, the three payment texts) alongside anything a tenant
 * writes from scratch for an automation step — both live in the same tables
 * now, see 20260815000001_system_message_templates.sql.
 */
export default function MessageTemplatesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
        <p className="text-muted-foreground">
          The emails and texts your automations send — including the built-in appointment
          and payment reminders. Write them once in your own words, then attach one to any
          step that sends a message.
        </p>
      </div>
      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-4">
          <EmailTemplatesManager />
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <SmsTemplatesManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
