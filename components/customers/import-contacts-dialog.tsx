'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  IMPORT_FIELDS,
  IMPORT_CHUNK_SIZE,
  IMPORT_MAX_ROWS,
  parseImportRow,
  autoMapHeaders,
} from '@/lib/validations/customer-import'

type Phase = 'select' | 'map' | 'importing' | 'done'
type CsvRow = Record<string, string>
const SKIP = '__skip__'

interface Detail { row: number; status: 'skipped' | 'error'; reason: string }

interface Props {
  open: boolean
  onClose: () => void
}

export default function ImportContactsDialog({ open, onClose }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<Phase>('select')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [parseError, setParseError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary] = useState({ imported: 0, skipped: 0, failed: 0, details: [] as Detail[] })

  const reset = useCallback(() => {
    setPhase('select'); setFileName(''); setHeaders([]); setRows([])
    setMapping({}); setParseError(null); setProgress({ done: 0, total: 0 })
    setSummary({ imported: 0, skipped: 0, failed: 0, details: [] })
  }, [])

  const handleClose = useCallback(() => { reset(); onClose() }, [reset, onClose])

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    const Papa = (await import('papaparse')).default
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const hdrs = (res.meta.fields || []).filter(Boolean)
        const data = (res.data || []).filter((r) => Object.values(r).some((v) => v && String(v).trim()))
        if (hdrs.length === 0 || data.length === 0) {
          setParseError('No rows found. Make sure the file is a CSV with a header row.')
          return
        }
        if (data.length > IMPORT_MAX_ROWS) {
          setParseError(`That file has ${data.length.toLocaleString()} rows. The limit is ${IMPORT_MAX_ROWS.toLocaleString()} per import.`)
          return
        }
        setFileName(file.name)
        setHeaders(hdrs)
        setRows(data)
        setMapping(autoMapHeaders(hdrs))
        setPhase('map')
      },
      error: (err) => setParseError(err.message || 'Failed to read the file.'),
    })
  }, [])

  const mapRow = useCallback((raw: CsvRow, map: Record<string, string>) => {
    const out: Record<string, string> = {}
    for (const f of IMPORT_FIELDS) {
      const header = map[f.key]
      if (header && header !== SKIP) out[f.key] = raw[header] ?? ''
    }
    return out
  }, [])

  // Live preview: how many rows will validate, and the first few problems.
  const preview = useMemo(() => {
    if (phase !== 'map') return { valid: 0, errors: [] as Detail[] }
    let valid = 0
    const errors: Detail[] = []
    rows.forEach((raw, i) => {
      const parsed = parseImportRow(mapRow(raw, mapping))
      if (parsed.success) valid++
      else if (errors.length < 8) errors.push({ row: i + 2, status: 'error', reason: parsed.error.issues[0]?.message || 'Invalid row' })
    })
    return { valid, errors }
  }, [phase, rows, mapping, mapRow])

  const firstNameMapped = !!mapping.first_name && mapping.first_name !== SKIP

  const runImport = useCallback(async () => {
    setPhase('importing')
    const mapped = rows.map((r) => mapRow(r, mapping))
    setProgress({ done: 0, total: mapped.length })
    let imported = 0, skipped = 0, failed = 0
    const details: Detail[] = []

    for (let offset = 0; offset < mapped.length; offset += IMPORT_CHUNK_SIZE) {
      const chunk = mapped.slice(offset, offset + IMPORT_CHUNK_SIZE)
      try {
        const res = await fetch('/api/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: chunk }),
        })
        if (!res.ok) throw new Error(`Server responded ${res.status}`)
        const data = await res.json()
        ;(data.results as Array<{ status: string; reason?: string }>).forEach((r, j) => {
          const rowNum = offset + j + 2
          if (r.status === 'imported') imported++
          else if (r.status === 'skipped') { skipped++; if (details.length < 200) details.push({ row: rowNum, status: 'skipped', reason: r.reason || 'Skipped' }) }
          else { failed++; if (details.length < 200) details.push({ row: rowNum, status: 'error', reason: r.reason || 'Failed' }) }
        })
      } catch {
        failed += chunk.length
        if (details.length < 200) details.push({ row: offset + 2, status: 'error', reason: 'Network or server error for this batch' })
      }
      setProgress({ done: Math.min(offset + IMPORT_CHUNK_SIZE, mapped.length), total: mapped.length })
    }

    setSummary({ imported, skipped, failed, details })
    setPhase('done')
    if (imported > 0) {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      toast({ title: 'Import complete', description: `${imported} contact${imported === 1 ? '' : 's'} added.` })
    }
  }, [rows, mapping, mapRow, queryClient, toast])

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            {phase === 'select' && 'Upload a CSV with a header row. You can map the columns on the next step.'}
            {phase === 'map' && `${rows.length.toLocaleString()} rows from ${fileName}. Match your columns to contact fields.`}
            {phase === 'importing' && 'Importing — you can keep this open.'}
            {phase === 'done' && 'Import finished.'}
          </DialogDescription>
        </DialogHeader>

        {/* SELECT */}
        {phase === 'select' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-10 text-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Choose a CSV file</span>
              <span className="text-xs text-gray-500">First row must be column headers</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>
            {parseError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* MAP */}
        {phase === 'map' && (
          <div className="space-y-4">
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-sm">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </div>
                  <Select
                    value={mapping[f.key] || SKIP}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                  >
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP}>— Don&apos;t import —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {!firstNameMapped ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Map a column to <strong>First Name</strong> — it&apos;s required.</AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-green-100 text-green-800">{preview.valid} ready</Badge>
                {preview.errors.length > 0 && <Badge variant="destructive">{rows.length - preview.valid} with issues</Badge>}
              </div>
            )}

            {firstNameMapped && preview.errors.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 space-y-0.5">
                {preview.errors.map((e, i) => <div key={i}>Row {e.row}: {e.reason}</div>)}
                <div className="text-amber-600">Rows with issues are skipped; the rest still import.</div>
              </div>
            )}
          </div>
        )}

        {/* IMPORTING */}
        {phase === 'importing' && (
          <div className="space-y-3 py-4">
            <Progress value={pct} />
            <div className="text-sm text-center text-gray-600">
              {progress.done.toLocaleString()} / {progress.total.toLocaleString()} processed ({pct}%)
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <span className="text-lg font-semibold">{summary.imported.toLocaleString()} contacts imported</span>
            </div>
            <div className="flex gap-2 text-sm">
              {summary.skipped > 0 && <Badge variant="secondary">{summary.skipped} skipped (duplicates)</Badge>}
              {summary.failed > 0 && <Badge variant="destructive">{summary.failed} failed</Badge>}
            </div>
            {summary.details.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border p-3 text-xs space-y-0.5">
                {summary.details.map((d, i) => (
                  <div key={i} className={d.status === 'error' ? 'text-red-700' : 'text-gray-600'}>
                    Row {d.row}: {d.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === 'map' && (
            <>
              <Button variant="outline" onClick={reset}>Choose a different file</Button>
              <Button onClick={runImport} disabled={!firstNameMapped || preview.valid === 0}>
                Import {preview.valid.toLocaleString()} contact{preview.valid === 1 ? '' : 's'}
              </Button>
            </>
          )}
          {phase === 'importing' && (
            <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</Button>
          )}
          {phase === 'done' && (
            <>
              <Button variant="outline" onClick={reset}><FileText className="mr-2 h-4 w-4" />Import another</Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
          {phase === 'select' && <Button variant="outline" onClick={handleClose}>Cancel</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
