import { z } from 'zod'

// QuickBooks sync customer
export const syncCustomerSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
})

// QuickBooks sync invoice
export const syncInvoiceSchema = z.object({
  invoice_id: z.string().uuid('Invalid invoice ID'),
})

// Mailchimp sync contacts
export const syncContactsSchema = z.object({
  list_id: z.string().optional(),
  segment_id: z.string().uuid().optional(),
})

// Export types
export type SyncCustomerInput = z.infer<typeof syncCustomerSchema>
export type SyncInvoiceInput = z.infer<typeof syncInvoiceSchema>
