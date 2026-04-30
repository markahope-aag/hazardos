import jsPDF from 'jspdf'
import type { Manifest, ManifestVehicle, ManifestSnapshot } from '@/types/manifests'

export interface ManifestMediaItem {
  kind: 'image' | 'video'
  label: string
  /** Caption / location, shown beneath the thumbnail or beside the URL. */
  caption?: string | null
  /** Signed URL — used as a tappable link in the PDF. */
  url: string
  /**
   * Pre-fetched data URL for image embedding. If absent, the item is
   * rendered as a text link only. Videos always render as text links
   * since PDFs can't play video.
   */
  dataUrl?: string | null
}

/**
 * Generate a print-ready manifest PDF from the frozen snapshot + any
 * attached vehicles. Works in both Node (for email attachments) and
 * the browser (for direct download).
 *
 * `media` is optional — when provided, image thumbnails (up to 6) are
 * embedded on a "Site Media" page and video URLs are listed as tappable
 * links so the field crew can review the survey on the way to the job.
 */
export function generateManifestPDF(
  manifest: Manifest,
  vehicles: ManifestVehicle[] = [],
  media: ManifestMediaItem[] = [],
): jsPDF {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentW = pageW - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const s: ManifestSnapshot = manifest.snapshot

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('MANIFEST', margin, y)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(manifest.manifest_number, pageW - margin, y, { align: 'right' })
  y += 8

  doc.setDrawColor(200)
  doc.line(margin, y, pageW - margin, y)
  y += 4

  doc.setFontSize(9)
  doc.setTextColor(120)
  const statusLine = manifest.status === 'issued' && manifest.issued_at
    ? `Issued ${new Date(manifest.issued_at).toLocaleDateString()}`
    : 'Draft — not yet issued'
  doc.text(statusLine, margin, y)
  if (s.job?.scheduled_start_date) {
    const parts = [new Date(s.job.scheduled_start_date).toLocaleDateString()]
    if (s.job.scheduled_start_time) parts.push(`at ${s.job.scheduled_start_time}`)
    doc.text(`Scheduled: ${parts.join(' ')}`, pageW - margin, y, { align: 'right' })
  }
  doc.setTextColor(0)
  y += 10

  // --- helpers --------------------------------------------------------
  const heading = (text: string) => {
    ensureSpace(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(text, margin, y)
    y += 2
    doc.setDrawColor(220)
    doc.line(margin, y, pageW - margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
  }

  const keyValue = (label: string, value: string | null | undefined) => {
    if (!value) return
    ensureSpace(6)
    doc.setTextColor(120)
    doc.text(`${label}:`, margin, y)
    doc.setTextColor(0)
    const labelWidth = doc.getTextWidth(`${label}: `)
    const lines = doc.splitTextToSize(value, contentW - labelWidth)
    doc.text(lines, margin + labelWidth, y)
    y += lines.length * 5
  }

  const paragraph = (value: string | null | undefined) => {
    if (!value) return
    const lines = doc.splitTextToSize(value, contentW)
    ensureSpace(lines.length * 5 + 2)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 2
  }

  // --- Site ----------------------------------------------------------
  heading('SITE')
  const addr = [s.site?.address, s.site?.city, s.site?.state, s.site?.zip]
    .filter(Boolean)
    .join(', ')
  keyValue('Address', addr || '—')
  keyValue('Gate code', s.site?.gate_code)
  keyValue('Lockbox', s.site?.lockbox_code)
  if (s.site?.contact_onsite_name || s.site?.contact_onsite_phone) {
    const contact = [s.site.contact_onsite_name, s.site.contact_onsite_phone]
      .filter(Boolean)
      .join(' · ')
    keyValue('Onsite contact', contact)
  }
  y += 4

  // --- Job scope -----------------------------------------------------
  heading('JOB SCOPE')
  keyValue('Job', s.job?.name || s.job?.job_number || '—')
  if (s.job?.hazard_types?.length) {
    keyValue('Hazards', s.job.hazard_types.join(', '))
  }
  if (s.job?.estimated_duration_hours) {
    keyValue('Est. duration', `${s.job.estimated_duration_hours} hours`)
  }
  if (s.estimate?.scope_of_work) {
    doc.setTextColor(120)
    doc.text('Scope of work:', margin, y + 4)
    doc.setTextColor(0)
    y += 8
    paragraph(s.estimate.scope_of_work)
  }
  if (s.job?.access_notes) {
    doc.setTextColor(120)
    doc.text('Access notes:', margin, y + 2)
    doc.setTextColor(0)
    y += 7
    paragraph(s.job.access_notes)
  }
  if (s.job?.special_instructions) {
    doc.setTextColor(120)
    doc.text('Special instructions:', margin, y + 2)
    doc.setTextColor(0)
    y += 7
    paragraph(s.job.special_instructions)
  }
  y += 4

  // --- Crew ----------------------------------------------------------
  heading(`CREW (${s.crew?.length || 0})`)
  if (!s.crew?.length) {
    doc.setTextColor(120)
    doc.text('No crew assigned.', margin, y)
    doc.setTextColor(0)
    y += 6
  } else {
    for (const c of s.crew) {
      ensureSpace(6)
      const parts = [c.name]
      if (c.role) parts.push(c.role)
      if (c.is_lead) parts.push('LEAD')
      const times =
        c.scheduled_start || c.scheduled_end
          ? `${c.scheduled_start || ''}${c.scheduled_start && c.scheduled_end ? ' – ' : ''}${c.scheduled_end || ''}`
          : ''
      doc.text(`• ${parts.join(' · ')}`, margin, y)
      if (times) doc.text(times, pageW - margin, y, { align: 'right' })
      y += 5
    }
  }
  y += 4

  // --- Materials -----------------------------------------------------
  heading(`MATERIALS (${s.materials?.length || 0})`)
  if (!s.materials?.length) {
    doc.setTextColor(120)
    doc.text('None listed.', margin, y)
    doc.setTextColor(0)
    y += 6
  } else {
    for (const m of s.materials) {
      ensureSpace(6)
      const line = `• ${m.name}${m.type ? ' · ' + m.type : ''}`
      const qty =
        m.quantity_estimated != null ? `${m.quantity_estimated}${m.unit ? ' ' + m.unit : ''}` : ''
      doc.text(line, margin, y)
      if (qty) doc.text(qty, pageW - margin, y, { align: 'right' })
      y += 5
    }
  }
  y += 4

  // --- Equipment -----------------------------------------------------
  heading(`EQUIPMENT (${s.equipment?.length || 0})`)
  if (!s.equipment?.length) {
    doc.setTextColor(120)
    doc.text('None listed.', margin, y)
    doc.setTextColor(0)
    y += 6
  } else {
    for (const e of s.equipment) {
      ensureSpace(6)
      const tail = [e.type, e.is_rental ? 'rental' : null].filter(Boolean).join(' · ')
      const line = `• ${e.name}${tail ? ' · ' + tail : ''}`
      doc.text(line, margin, y)
      doc.text(`×${e.quantity ?? 1}`, pageW - margin, y, { align: 'right' })
      y += 5
    }
  }
  y += 4

  // --- Vehicles ------------------------------------------------------
  heading(`VEHICLES (${vehicles.length})`)
  if (vehicles.length === 0) {
    doc.setTextColor(120)
    doc.text('None listed.', margin, y)
    doc.setTextColor(0)
    y += 6
  } else {
    for (const v of vehicles) {
      ensureSpace(8)
      const line = [v.make_model, v.vehicle_type].filter(Boolean).join(' · ') || 'Vehicle'
      const plateStr = v.plate ? `  ${v.plate}` : ''
      doc.text(`• ${line}${plateStr}${v.is_rental ? ' · rental' : ''}`, margin, y)
      y += 5
      if (v.driver_name || v.rental_vendor) {
        doc.setTextColor(120)
        const sub = [v.driver_name ? `Driver: ${v.driver_name}` : null, v.rental_vendor ? `Vendor: ${v.rental_vendor}` : null]
          .filter(Boolean)
          .join(' · ')
        doc.text(`  ${sub}`, margin, y)
        doc.setTextColor(0)
        y += 5
      }
    }
  }
  y += 4

  // --- Extra items ---------------------------------------------------
  if (s.extra_items?.length) {
    heading(`ADDITIONAL ITEMS (${s.extra_items.length})`)
    for (const item of s.extra_items) {
      ensureSpace(6)
      doc.text(`• ${item.label}${item.detail ? ' — ' + item.detail : ''}`, margin, y)
      y += 5
    }
    y += 4
  }

  // --- Site media ----------------------------------------------------
  // Embeds up to 6 photo thumbnails (3-up grid). Anything beyond that —
  // and all videos — render as tappable URL links, so the crew can pull
  // them up on a phone PDF reader on the way to the job.
  const photos = media.filter((m) => m.kind === 'image' && m.dataUrl)
  const videos = media.filter((m) => m.kind === 'video')
  const overflowPhotos = media.filter((m) => m.kind === 'image' && !m.dataUrl)
  const MAX_EMBED = 6

  if (photos.length > 0 || videos.length > 0 || overflowPhotos.length > 0) {
    heading(`SITE MEDIA (${media.length})`)
    const embeddable = photos.slice(0, MAX_EMBED)

    if (embeddable.length > 0) {
      const cols = 3
      const gutter = 4
      const cellW = (contentW - gutter * (cols - 1)) / cols
      const cellH = cellW * 0.75 // 4:3
      const captionH = 5

      for (let i = 0; i < embeddable.length; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        if (col === 0) {
          ensureSpace(cellH + captionH + 4)
        }
        const x = margin + col * (cellW + gutter)
        const cellY = y + row * (cellH + captionH + 4)

        const item = embeddable[i]
        try {
          // jsPDF auto-detects format from the data URL prefix.
          doc.addImage(item.dataUrl as string, x, cellY, cellW, cellH)
        } catch {
          doc.setDrawColor(220)
          doc.rect(x, cellY, cellW, cellH)
          doc.setFontSize(8)
          doc.setTextColor(150)
          doc.text('Image unavailable', x + cellW / 2, cellY + cellH / 2, {
            align: 'center',
          })
          doc.setTextColor(0)
        }

        doc.setFontSize(8)
        doc.setTextColor(80)
        const caption = (item.caption || item.label).slice(0, 60)
        doc.text(caption, x, cellY + cellH + 4)
        doc.setTextColor(0)
        doc.setFontSize(10)
      }

      const totalRows = Math.ceil(embeddable.length / cols)
      y += totalRows * (cellH + captionH + 4) + 4
    }

    const linkLines = [
      ...overflowPhotos.map((m) => ({
        prefix: `Photo · ${m.caption || m.label}`,
        url: m.url,
      })),
      ...videos.map((m) => ({
        prefix: `Video · ${m.caption || m.label}`,
        url: m.url,
      })),
    ]

    if (linkLines.length > 0) {
      ensureSpace(8)
      doc.setFontSize(9)
      doc.setTextColor(80)
      doc.text(
        videos.length > 0
          ? 'Tap to view videos and additional photos:'
          : 'Tap to view additional photos:',
        margin,
        y,
      )
      y += 5
      doc.setFontSize(9)
      for (const line of linkLines) {
        ensureSpace(5)
        const wrapped = doc.splitTextToSize(line.prefix, contentW)
        doc.setTextColor(0)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 4
        doc.setTextColor(60, 90, 200)
        // jsPDF's textWithLink wraps text in an annotation rectangle.
        doc.textWithLink(line.url, margin, y, { url: line.url })
        y += 6
      }
      doc.setTextColor(0)
      doc.setFontSize(10)
    }

    y += 2
  }

  // --- Dispatch notes ------------------------------------------------
  if (manifest.notes) {
    heading('DISPATCH NOTES')
    paragraph(manifest.notes)
  }

  // Sign-off box at the bottom of the last page
  ensureSpace(22)
  doc.setDrawColor(200)
  doc.rect(margin, pageH - margin - 20, contentW, 16)
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Crew lead signature', margin + 2, pageH - margin - 17)
  doc.text('Date', pageW / 2 + 2, pageH - margin - 17)
  doc.setTextColor(0)

  return doc
}

export function generateManifestPDFBlob(
  manifest: Manifest,
  vehicles: ManifestVehicle[] = [],
  media: ManifestMediaItem[] = [],
): Blob {
  const doc = generateManifestPDF(manifest, vehicles, media)
  return doc.output('blob')
}

export function generateManifestPDFBase64(
  manifest: Manifest,
  vehicles: ManifestVehicle[] = [],
  media: ManifestMediaItem[] = [],
): string {
  const doc = generateManifestPDF(manifest, vehicles, media)
  // jsPDF's datauristring returns "data:application/pdf;filename=...;base64,XXX"
  // — we want the raw base64 for Resend attachments.
  const uri = doc.output('datauristring')
  return uri.split('base64,')[1] ?? ''
}
