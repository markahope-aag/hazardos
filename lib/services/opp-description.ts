/**
 * Builds the OPP "Project Description" paragraph.
 *
 * The Wisconsin DHS form wants the type of project plus the type and
 * amount of asbestos-containing material being removed or disturbed.
 * The office was retyping that from the proposal every time, because the
 * generator seeded the field with "Hazards: asbestos. Containment level:
 * type ii.", which is accurate but carries no quantities, so it was
 * never the text that actually went on the form.
 *
 * Source order matches where the real wording lives:
 *   1. the estimate's scope of work (this is the proposal text verbatim)
 *   2. the estimate's project description (set through the API only, so
 *      it is rarer, but it is still prose someone wrote about this job)
 *   3. the estimate's line items (quantity + unit + description)
 *   4. the site survey's measured quantities
 *   5. the job's hazard types and containment level (last-resort stub)
 */

export type OppDescriptionSource =
  | 'estimate_scope'
  | 'estimate_project_description'
  | 'estimate_line_items'
  | 'survey'
  | 'job'
  | 'none'

export interface OppLineItem {
  item_type: string | null
  description: string | null
  quantity: number | string | null
  unit: string | null
  notes?: string | null
  is_included?: boolean | null
}

export interface OppSurveyQuantities {
  material_type?: string | null
  hazard_subtype?: string | null
  area_sqft?: number | string | null
  linear_ft?: number | string | null
  volume_cuft?: number | string | null
}

export interface OppDescriptionInput {
  estimateScopeOfWork?: string | null
  estimateProjectDescription?: string | null
  lineItems?: OppLineItem[] | null
  survey?: OppSurveyQuantities | null
  hazardTypes?: string[] | null
  containmentLevel?: string | null
}

export interface OppDescriptionResult {
  text: string
  source: OppDescriptionSource
}

// Line item types that describe abatement work. Travel, permits, testing
// and disposal fees are budget lines, not scope. Putting "2 loads of
// disposal" on the DHS form tells the inspector nothing about what is
// being removed.
const SCOPE_ITEM_TYPES = new Set(['labor', 'material', 'other'])

// Only units that express an AMOUNT OF MATERIAL earn the "approximately
// X of Y" phrasing. This is an allow-list on purpose: real estimates price
// labor in hours, equipment in days, and travel in trips, and a line that
// reads "approximately 11 hour of Asbestos abatement labor" on a state
// form is worse than saying nothing. Anything not in here is dropped and
// the builder falls through to the survey measurements instead.
const MATERIAL_UNIT_ALIASES: Record<string, string> = {
  'sq ft': 'sq ft', sqft: 'sq ft', 'sq. ft.': 'sq ft', 'sq.ft.': 'sq ft',
  sf: 'sq ft', 'square foot': 'sq ft', 'square feet': 'sq ft',
  'linear ft': 'linear ft', 'linear feet': 'linear ft', 'linear foot': 'linear ft',
  lf: 'linear ft', 'ln ft': 'linear ft', 'lin ft': 'linear ft',
  ft: 'linear ft', feet: 'linear ft', foot: 'linear ft',
  'cubic yard': 'cubic yards', 'cubic yards': 'cubic yards', cy: 'cubic yards',
  'cu yd': 'cubic yards', 'cu. yd.': 'cubic yards',
  'cubic foot': 'cu ft', 'cubic feet': 'cu ft', 'cu ft': 'cu ft', cf: 'cu ft',
  'sq yd': 'sq yd', 'square yard': 'sq yd', 'square yards': 'sq yd',
}

const MAX_SCOPE_ITEMS = 12

/** Trim numeric(10,2) padding: 225.00 -> "225", 12.50 -> "12.5". */
function formatQuantity(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Number(n.toFixed(2)))
}

/** Normalize a unit to its canonical material measure, or null if it isn't one. */
function materialUnit(unit: string | null | undefined): string | null {
  if (!unit) return null
  const key = unit.trim().toLowerCase().replace(/\s+/g, ' ')
  return MATERIAL_UNIT_ALIASES[key] ?? null
}

/** "225 sq ft of two layers of sheet vinyl in the lower level kitchen" */
function measuredPhrase(item: OppLineItem): string | null {
  const description = item.description?.trim()
  if (!description) return null

  const quantity = formatQuantity(item.quantity)
  const unit = materialUnit(item.unit)
  if (!quantity || !unit) return null

  return `${quantity} ${unit} of ${description}`
}

function fromLineItems(lineItems: OppLineItem[]): string | null {
  const measured = lineItems
    .filter((li) => li.is_included !== false)
    .filter((li) => li.item_type && SCOPE_ITEM_TYPES.has(li.item_type))
    .slice(0, MAX_SCOPE_ITEMS)
    .map(measuredPhrase)
    .filter((phrase): phrase is string => phrase !== null)

  if (measured.length === 0) return null
  return `Removal and disposal of approximately ${measured.join('; ')}.`
}

function fromSurvey(survey: OppSurveyQuantities): string | null {
  const material =
    survey.material_type?.trim() || survey.hazard_subtype?.trim() || null

  const quantities: string[] = []
  const area = formatQuantity(survey.area_sqft)
  const linear = formatQuantity(survey.linear_ft)
  const volume = formatQuantity(survey.volume_cuft)
  if (area) quantities.push(`${area} sq ft`)
  if (linear) quantities.push(`${linear} linear ft`)
  if (volume) quantities.push(`${volume} cu ft`)

  if (quantities.length === 0) {
    return material ? `Removal and disposal of ${material}.` : null
  }

  const amount = quantities.join(' / ')
  return material
    ? `Removal and disposal of approximately ${amount} of ${material}.`
    : `Removal and disposal of approximately ${amount} of asbestos-containing material.`
}

function fromJob(
  hazardTypes: string[] | null | undefined,
  containmentLevel: string | null | undefined,
): string | null {
  const parts: string[] = []
  if (hazardTypes?.length) parts.push(`Hazards: ${hazardTypes.join(', ')}.`)
  if (containmentLevel) {
    parts.push(`Containment level: ${containmentLevel.replace(/_/g, ' ')}.`)
  }
  return parts.length > 0 ? parts.join(' ') : null
}

export function buildOppProjectDescription(
  input: OppDescriptionInput,
): OppDescriptionResult {
  const scope = input.estimateScopeOfWork?.trim()
  if (scope) return { text: scope, source: 'estimate_scope' }

  const projectDescription = input.estimateProjectDescription?.trim()
  if (projectDescription) {
    return { text: projectDescription, source: 'estimate_project_description' }
  }

  if (input.lineItems?.length) {
    const text = fromLineItems(input.lineItems)
    if (text) return { text, source: 'estimate_line_items' }
  }

  if (input.survey) {
    const text = fromSurvey(input.survey)
    if (text) return { text, source: 'survey' }
  }

  const jobText = fromJob(input.hazardTypes, input.containmentLevel)
  if (jobText) return { text: jobText, source: 'job' }

  return { text: '', source: 'none' }
}
