/**
 * Substitution for tenant-authored message templates.
 *
 * Templates are written by the customer's own staff and use `{{variable}}`
 * placeholders, matching the convention already used by the proposal templates
 * in docs/proposal-templates.
 *
 * Two properties this deliberately guarantees, both of which exist because the
 * output goes to a customer's inbox:
 *
 * 1. Values are substituted once and never re-scanned. A value containing
 *    `{{something}}` is inert text, not an instruction. Without this, data
 *    copied from a form field could name a variable the template author never
 *    referenced.
 *
 * 2. An unknown placeholder renders as nothing. It never falls back to reading
 *    a record. reminder-sender.ts notes that content comes only from the
 *    variables the scheduler promised were customer-safe, which keeps access
 *    codes, staff notes and internal comments out of outbound mail by
 *    construction. A template that could pull its own data would undo that.
 */

/** `{{ name }}` and `{{name}}` both match; keys are trimmed. */
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g

export type TemplateVariables = Record<string, string | null | undefined>

/**
 * Replaces every placeholder in one pass.
 *
 * Single pass matters: `String.replace` with a function evaluates each match
 * against the original string, so an inserted value can never be re-matched.
 */
export function renderTemplateBody(body: string, variables: TemplateVariables): string {
  return body.replace(PLACEHOLDER, (_match, key: string) => {
    const value = variables[key]
    return value === null || value === undefined ? '' : String(value)
  })
}

/**
 * Placeholders a template refers to, deduplicated and in first-use order.
 *
 * The editor uses this to warn that a template names something the event will
 * not supply, which is otherwise only discovered as a gap in a sent message.
 */
export function extractPlaceholders(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(PLACEHOLDER)) {
    found.add(match[1])
  }
  return [...found]
}

/** Placeholders in the template that the supplied variables do not cover. */
export function findMissingVariables(body: string, variables: TemplateVariables): string[] {
  return extractPlaceholders(body).filter((key) => {
    const value = variables[key]
    return value === null || value === undefined || value === ''
  })
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

/**
 * Renders a plain-text template into HTML.
 *
 * The whole body is escaped before line breaks become markup, so a tenant
 * cannot author HTML and a substituted value cannot introduce any. Templates
 * here are plain text on purpose: the people writing them are an office
 * manager and an estimator, not front-end developers, and an editor that
 * accepts markup is an editor that eventually sends broken markup.
 */
export function renderTemplateHtml(body: string, variables: TemplateVariables): string {
  const rendered = renderTemplateBody(body, variables)
  return escapeHtml(rendered)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('\n')
}
