import { z } from 'zod'

// QuickBooks sync customer (required for QuickBooks which needs a specific customer)
export const syncCustomerSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
})

// HubSpot sync contacts - customer_id is optional (if not provided, syncs all)
export const syncHubSpotContactsSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID').optional(),
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
