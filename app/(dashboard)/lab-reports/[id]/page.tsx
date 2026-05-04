import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LabReportDetail } from './lab-report-detail'

export default async function LabReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_reports')
    .select(`
      *,
      lab:labs!lab_id(id, name, contact_name, contact_email, contact_phone),
      estimate:estimates!estimate_id(id, estimate_number, project_name),
      work_order:work_orders!work_order_id(id, work_order_number),
      invoice:invoices!invoice_id(id, invoice_number),
      customer:customers!customer_id(id, name, company_name, email, phone)
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <LabReportDetail report={data} />
}
