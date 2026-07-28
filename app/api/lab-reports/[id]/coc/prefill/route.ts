import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { COC_FORM_TITLES } from '@/lib/validations/lab-coc'

// Hands the chain-of-custody dialog its defaults so the person packing
// samples isn't retyping the contractor block, the lab's address or the
// site for every submission.
export const GET = createApiHandlerWithParams(
  { requireAuth: true },
  async (_request, context, params) => {
    const reportId = params.id
    if (!reportId) throw new SecureError('VALIDATION_ERROR', 'Missing lab report id')

    const { supabase, profile, user } = context

    const [orgRes, reportRes, meRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('name, address, city, state, zip, phone, email')
        .eq('id', profile.organization_id)
        .single(),
      supabase
        .from('lab_reports')
        .select(
          `id, report_number, sample_type, ordered_date, turnaround, submitted_to,
           relinquished_by, sample_description,
           site_address, site_city, site_state, site_zip,
           lab:labs!lab_id(name, address, contact_phone, contact_name),
           samples:lab_report_samples(sample_number, description, location, sort_order)`,
        )
        .eq('id', reportId)
        .eq('organization_id', profile.organization_id)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', user.id)
        .single(),
    ])

    if (orgRes.error || !orgRes.data) throw new SecureError('NOT_FOUND', 'Organization not found')
    if (reportRes.error || !reportRes.data) throw new SecureError('NOT_FOUND', 'Lab report not found')

    const org = orgRes.data
    const report = reportRes.data as unknown as {
      report_number: string
      sample_type: string | null
      ordered_date: string
      turnaround: string | null
      submitted_to: string | null
      relinquished_by: string | null
      sample_description: string | null
      site_address: string | null
      site_city: string | null
      site_state: string | null
      site_zip: string | null
      lab: { name: string; address: string | null; contact_phone: string | null } | null
      samples: Array<{
        sample_number: string
        description: string
        location: string | null
        sort_order: number
      }> | null
    }

    const lab = Array.isArray(report.lab) ? report.lab[0] : report.lab
    const me = meRes.data

    // Whoever is generating the form is, by default, the person handing the
    // samples over — they can change it if someone else is driving them in.
    const meName =
      report.relinquished_by ||
      me?.full_name ||
      [me?.first_name, me?.last_name].filter(Boolean).join(' ') ||
      ''

    const samples = (report.samples ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        sample_number: s.sample_number,
        description: s.description,
        location: s.location ?? '',
      }))

    return NextResponse.json({
      report_number: report.report_number,
      form_title: COC_FORM_TITLES[report.sample_type ?? 'other'] ?? COC_FORM_TITLES.other,
      contractor: {
        name: org.name,
        address: org.address,
        city: org.city,
        state: org.state,
        zip: org.zip,
        phone: org.phone,
        email: org.email,
      },
      lab: {
        name: lab?.name ?? '',
        address: lab?.address ?? '',
        phone: lab?.contact_phone ?? '',
      },
      submitted_to: report.submitted_to ?? '',
      site: {
        address: report.site_address ?? '',
        city: report.site_city ?? '',
        state: report.site_state ?? '',
        zip: report.site_zip ?? '',
      },
      collected_date: report.ordered_date,
      turnaround: report.turnaround ?? 'Standard',
      relinquished_by: meName,
      // If no structured samples exist yet, seed one row from the report's
      // free-text description so the dialog opens with something to edit
      // rather than an empty list.
      samples:
        samples.length > 0
          ? samples
          : [{ sample_number: '1', description: report.sample_description ?? '', location: '' }],
    })
  },
)
