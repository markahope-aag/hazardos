import { z } from 'zod'

// Contact CSV import (EX1). A deliberately lenient row schema: a CSV of
// contacts usually carries a name plus an email and/or phone, rarely a full
// mailing address, so — unlike the interactive customer form — only a first
// name is required here. Everything else is optional and trimmed.

export interface ImportField {
  key: string
  label: string
  required?: boolean
  /** Lowercased header variants used to auto-map CSV columns to this field. */
  aliases: string[]
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: 'first_name', label: 'First Name', required: true, aliases: ['first name', 'firstname', 'first', 'fname', 'given name'] },
  { key: 'last_name', label: 'Last Name', aliases: ['last name', 'lastname', 'last', 'lname', 'surname', 'family name'] },
  { key: 'email', label: 'Email', aliases: ['email', 'email address', 'e-mail', 'mail'] },
  { key: 'mobile_phone', label: 'Mobile Phone', aliases: ['mobile', 'mobile phone', 'cell', 'cell phone', 'phone', 'mobile number', 'cellphone'] },
  { key: 'office_phone', label: 'Office Phone', aliases: ['office', 'office phone', 'work phone', 'business phone', 'landline'] },
  { key: 'title', label: 'Title', aliases: ['title', 'job title', 'position', 'role'] },
  { key: 'company_name', label: 'Company', aliases: ['company', 'company name', 'organization', 'organisation', 'business'] },
  { key: 'contact_type', label: 'Type (residential/commercial)', aliases: ['type', 'contact type', 'category'] },
  { key: 'address_line1', label: 'Address', aliases: ['address', 'address line 1', 'street', 'street address', 'address1'] },
  { key: 'city', label: 'City', aliases: ['city', 'town'] },
  { key: 'state', label: 'State', aliases: ['state', 'province', 'region'] },
  { key: 'zip', label: 'ZIP', aliases: ['zip', 'zip code', 'zipcode', 'postal code', 'postcode'] },
  { key: 'notes', label: 'Notes', aliases: ['notes', 'note', 'comments', 'comment'] },
]

// Normalize a raw CSV row before validation: trim every string and drop blank
// cells entirely so plain .optional() fields treat them as absent, and coerce
// a free-text type column to the residential/commercial enum (anything that
// looks commercial/business wins; blank/other -> residential). Keeping this
// separate from the schema sidesteps Zod v4's preprocess+optional quirk (an
// absent key reads as "nonoptional") and gives one place that defines "blank".
export function normalizeImportRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed !== '') out[k] = trimmed
    } else if (v != null) {
      out[k] = v
    }
  }
  if (typeof out.contact_type === 'string') {
    const s = out.contact_type.toLowerCase()
    out.contact_type = s.startsWith('c') || s.includes('business') || s.includes('commercial')
      ? 'commercial'
      : 'residential'
  }
  return out
}

export const contactImportRowSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional(),
  email: z.string().max(255).email('Invalid email').optional().transform((v) => v?.toLowerCase()),
  mobile_phone: z.string().max(20).optional(),
  office_phone: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  company_name: z.string().max(255).optional(),
  contact_type: z.enum(['residential', 'commercial']).default('residential'),
  address_line1: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
})

export type ContactImportRow = z.infer<typeof contactImportRowSchema>

/** Normalize a raw CSV row and validate it. The single entry point used by the
 *  import API, the client preview, and tests so they never diverge. */
export function parseImportRow(raw: Record<string, unknown>) {
  return contactImportRowSchema.safeParse(normalizeImportRow(raw))
}

// Bounds. Chunking keeps each request small so a 500+ row import streams in
// and the UI stays responsive instead of blocking on one huge insert.
export const IMPORT_MAX_ROWS = 5000
export const IMPORT_CHUNK_SIZE = 100

// One row's mapped values as sent from the client (field key -> raw string).
export const importChunkSchema = z.object({
  contacts: z
    .array(z.record(z.string(), z.union([z.string(), z.null()])))
    .min(1, 'No contacts to import')
    .max(IMPORT_CHUNK_SIZE, `Send at most ${IMPORT_CHUNK_SIZE} contacts per request`),
})

export type ImportRowResult =
  | { status: 'imported' }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string }

/** Auto-map CSV headers to import fields by alias. Returns { fieldKey: header }. */
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const usedHeaders = new Set<string>()
  for (const field of IMPORT_FIELDS) {
    const match = headers.find((h) => {
      if (usedHeaders.has(h)) return false
      const norm = h.trim().toLowerCase()
      return norm === field.key || field.aliases.includes(norm)
    })
    if (match) {
      mapping[field.key] = match
      usedHeaders.add(match)
    }
  }
  return mapping
}
