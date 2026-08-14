import { z } from 'zod'

/**
 * Validation for tenant-authored email templates.
 *
 * Bodies are plain text with `{{variable}}` placeholders. Deliberately not
 * HTML: the people writing these are an office manager and an estimator, and
 * the renderer escapes everything anyway, so accepting markup would only mean
 * customers receive visible angle brackets.
 */

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Give the template a name').max(120),
  subject: z.string().min(1, 'Write a subject line').max(300),
  // Generous but bounded. A message longer than this is a document, and it
  // would be truncated by mail clients long before anyone read it.
  body: z.string().min(1, 'Write the message').max(20000),
  is_active: z.boolean().optional(),
})

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial()

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
