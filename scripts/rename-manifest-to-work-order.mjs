// One-shot rename: Manifest → Work Order across the codebase.
//
// Skips paths that should keep "manifest" terminology:
//   - public/manifest.json (PWA manifest)
//   - app/sw.ts, app/layout.tsx (PWA references)
//   - next.config.mjs (CSP for PWA manifest)
//   - supabase/migrations/* (history is sacred — new migration handles
//     the schema rename)
//   - scripts/combined-migration.sql (legacy snapshot, not run)
//   - This script itself
//   - Anything referencing the EPA "Waste Manifest" on disposal records
//     (job_disposal.manifest_number, manifest_date, manifest_document_url)
//
// Inside files that are renamed, we apply these substitutions in order.
// Order matters — longer / more specific patterns win.

import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, sep, posix } from 'node:path'

const ROOT = process.cwd()

// Files that mention "manifest" in a non-work-order context. We skip
// them entirely. Paths are POSIX-style relative to repo root.
const SKIP_FILES = new Set([
  'public/manifest.json',
  'app/sw.ts',
  'app/layout.tsx',
  'next.config.mjs',
  'scripts/combined-migration.sql',
  'scripts/rename-manifest-to-work-order.mjs',
  'CLAUDE.md',
])

// Skip the entire Supabase migration history. Renames live in a new
// migration file — touching old ones rewrites history.
const SKIP_DIR_PREFIXES = [
  'supabase/migrations/',
  'node_modules/',
  '.next/',
  '.git/',
]

// Lines that should be left alone even inside an otherwise-renamed file.
// We match by substring on the raw line. This is the EPA Waste Manifest
// terminology on the job_disposal table — different document, different
// concept, intentionally untouched.
const LINE_PRESERVE_SUBSTRINGS = [
  'disposal_manifest',
  'Disposal Manifest',
  'Waste Manifest',
  'waste manifest',
  // job_disposal column references — these stay even though they
  // contain "manifest_number" and "manifest_date".
  'job_disposal',
  'JobDisposal',
]

// Substitutions, in priority order. Each is [pattern, replacement].
// Patterns are RegExp with global flag. Be careful: a substitution can
// match output of an earlier substitution if patterns overlap, so
// order longest/most-specific first.
const SUBS = [
  // Schema-style identifiers (snake_case) — must run before generic
  // "manifest" so we don't end up with "work_orderlater_id".
  [/manifest_vehicles/g, 'work_order_vehicles'],
  [/manifest_number/g, 'work_order_number'],
  [/manifest_id/g, 'work_order_id'],
  [/Manifest_(\w)/g, 'WorkOrder_$1'],

  // Whole-word variable / function name camelCase forms
  [/buildManifestSnapshotFromJob/g, 'buildWorkOrderSnapshotFromJob'],
  [/generateManifestPDFBase64/g, 'generateWorkOrderPDFBase64'],
  [/generateManifestPDFBlob/g, 'generateWorkOrderPDFBlob'],
  [/generateManifestPDF/g, 'generateWorkOrderPDF'],
  [/createManifestSchema/g, 'createWorkOrderSchema'],
  [/updateManifestSchema/g, 'updateWorkOrderSchema'],
  [/manifestVehicleSchema/g, 'workOrderVehicleSchema'],
  [/CreateManifestInput/g, 'CreateWorkOrderInput'],
  [/UpdateManifestInput/g, 'UpdateWorkOrderInput'],
  [/ManifestVehicleInput/g, 'WorkOrderVehicleInput'],
  [/ManifestSnapshot/g, 'WorkOrderSnapshot'],
  [/ManifestVehicle/g, 'WorkOrderVehicle'],
  [/ManifestMediaItem/g, 'WorkOrderMediaItem'],
  [/ManifestStatus/g, 'WorkOrderStatus'],
  [/ManifestWithVehicles/g, 'WorkOrderWithVehicles'],
  [/ManifestRow/g, 'WorkOrderRow'],
  [/ManifestDetail/g, 'WorkOrderDetail'],
  [/ManifestDetailPage/g, 'WorkOrderDetailPage'],
  [/ManifestsPage/g, 'WorkOrdersPage'],

  // Route paths
  [/\/api\/manifests/g, '/api/work-orders'],
  [/'\/manifests/g, "'/work-orders"],
  [/`\/manifests/g, '`/work-orders'],

  // Module specifiers
  [/@\/types\/manifests/g, '@/types/work-orders'],
  [/@\/lib\/validations\/manifests/g, '@/lib/validations/work-orders'],
  [/@\/lib\/services\/manifests-service/g, '@/lib/services/work-orders-service'],
  [/@\/lib\/services\/manifest-pdf-generator/g, '@/lib/services/work-order-pdf-generator'],

  // SQL table names — used in `.from('manifests')` etc.
  [/'manifests'/g, "'work_orders'"],
  [/'manifest_vehicles'/g, "'work_order_vehicles'"],

  // RPC name
  [/'generate_manifest_number'/g, "'generate_work_order_number'"],

  // PascalCase type Manifest (must run after the more-specific
  // ManifestX patterns above)
  [/\bManifest\b/g, 'WorkOrder'],

  // camelCase variable manifest / manifests (whole word)
  [/\bmanifests\b/g, 'workOrders'],
  [/\bmanifest\b/g, 'workOrder'],

  // UI labels — PascalCased "Manifest" → "Work Order", "manifest" → "work order"
  // Run AFTER identifier passes so we don't double-rewrite.
  // Already handled by \bManifest\b → WorkOrder above for code; for
  // user-facing strings these patterns catch the spaced forms.
  [/Generate Manifests/g, 'Generate Work Orders'],
  [/Generate Manifest/g, 'Generate Work Order'],
  [/MANIFEST/g, 'WORK ORDER'],
]

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(p)
    } else if (e.isFile()) {
      yield p
    }
  }
}

function shouldProcess(absPath) {
  const rel = absPath.slice(ROOT.length + 1).split(sep).join(posix.sep)
  if (SKIP_FILES.has(rel)) return false
  for (const prefix of SKIP_DIR_PREFIXES) {
    if (rel.startsWith(prefix)) return false
  }
  // Only process source/text files we care about.
  if (!/\.(ts|tsx|js|jsx|mjs|md|json|sql)$/.test(absPath)) return false
  return true
}

function transform(text) {
  const lines = text.split('\n')
  let touched = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Preserve lines with EPA waste manifest references verbatim.
    if (LINE_PRESERVE_SUBSTRINGS.some((s) => line.includes(s))) continue
    let next = line
    for (const [pat, rep] of SUBS) {
      next = next.replace(pat, rep)
    }
    if (next !== line) {
      lines[i] = next
      touched = true
    }
  }
  return { text: lines.join('\n'), touched }
}

let filesScanned = 0
let filesChanged = 0

for await (const abs of walk(ROOT)) {
  if (!shouldProcess(abs)) continue
  filesScanned++
  try {
    const stat = statSync(abs)
    if (!stat.isFile()) continue
    const text = readFileSync(abs, 'utf8')
    if (!/manifest/i.test(text)) continue
    const { text: next, touched } = transform(text)
    if (touched) {
      writeFileSync(abs, next, 'utf8')
      filesChanged++
      console.log('  rewrote', abs.slice(ROOT.length + 1))
    }
  } catch (err) {
    console.error('Error on', abs, err.message)
  }
}

console.log(`\nscanned ${filesScanned} files, rewrote ${filesChanged}`)
