/**
 * Regression coverage for a systemic bug introduced by
 * 20260505000090_composite_fk_org_integrity.sql, which upgraded several
 * single-column foreign keys to composite (column, organization_id) keys
 * for tenant-isolation integrity. PostgREST's `!column_name` embed-hint
 * syntax only resolves against single-column FKs, so every embed using the
 * old column-name hint started failing with PGRST200 ("could not find a
 * relationship") the moment its FK went composite — silently in some
 * call sites (caught and logged), as a hard 404 in others.
 *
 * Found while investigating J10 (work orders / equipment logging
 * inaccessible): work_orders.job_id was one of the upgraded columns, and
 * `jobs!job_id` broke the work-orders list/detail routes. The same
 * migration touched 5 other relationships, all fixed here by hinting on
 * the actual constraint name (`<table>_<column>_org_fkey`, the naming
 * convention the migration's own upgrade function uses) instead of the
 * column name.
 *
 * These tests run the exact SELECT string each fixed call site uses,
 * against the real DB, so they'd fail immediately if the hint regresses
 * back to the column name.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const envResult = config({ path: '.env.local' })
const envVars = envResult.parsed || {}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const canRunLiveDbTests = Boolean(supabaseUrl && serviceRoleKey)

const adminClient = canRunLiveDbTests
  ? createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
  : null

describe.skipIf(!canRunLiveDbTests)('composite-FK embed hints', () => {
  let orgId: string
  let customerId: string
  let jobId: string
  let surveyId: string
  let estimateId: string
  let invoiceId: string
  let propertyId: string
  let orgDocumentId: string
  let jobDocumentId: string

  beforeAll(async () => {
    if (!adminClient) return

    const { data: org } = await adminClient
      .from('organizations')
      .insert({ name: `FK Embed Hint Test Org ${Date.now()}` })
      .select('id')
      .single()
    orgId = org!.id

    const { data: customer } = await adminClient
      .from('customers')
      .insert({
        organization_id: orgId,
        first_name: 'Test', last_name: 'Customer', name: 'Test Customer',
        contact_type: 'residential', status: 'inquiry',
      })
      .select('id')
      .single()
    customerId = customer!.id

    const { data: survey } = await adminClient
      .from('site_surveys')
      .insert({
        organization_id: orgId, customer_id: customerId,
        job_name: 'FK embed test survey', customer_name: 'Test Customer',
        site_address: '1 Test St', site_city: 'Denver', site_state: 'CO', site_zip: '80202',
        hazard_type: 'asbestos', status: 'draft',
      })
      .select('id')
      .single()
    surveyId = survey!.id

    const { data: estimate } = await adminClient
      .from('estimates')
      .insert({
        organization_id: orgId, site_survey_id: surveyId, customer_id: customerId,
        estimate_number: `EST-FK-TEST-${Date.now()}`, status: 'approved', total: 1000,
      })
      .select('id')
      .single()
    estimateId = estimate!.id

    const { data: job } = await adminClient
      .from('jobs')
      .insert({
        organization_id: orgId, customer_id: customerId,
        job_number: `JOB-FK-TEST-${Date.now()}`,
        scheduled_start_date: '2026-07-20', job_address: '1 Test St',
      })
      .select('id')
      .single()
    jobId = job!.id

    const { data: invoice } = await adminClient
      .from('invoices')
      .insert({
        organization_id: orgId, job_id: jobId, customer_id: customerId,
        invoice_number: `INV-FK-TEST-${Date.now()}`, status: 'draft',
        invoice_date: '2026-07-13', due_date: '2026-08-13', subtotal: 100, total: 100, balance_due: 100,
      })
      .select('id')
      .single()
    invoiceId = invoice!.id

    const { data: property } = await adminClient
      .from('properties')
      .insert({ organization_id: orgId, address_line1: '1 Test St', city: 'Denver', state: 'CO', zip: '80202' })
      .select('id')
      .single()
    propertyId = property!.id

    const { data: orgDoc } = await adminClient
      .from('organization_documents')
      .insert({ organization_id: orgId, file_name: 'license.pdf', storage_path: 'org/license.pdf', display_name: 'Contractor License' })
      .select('id')
      .single()
    orgDocumentId = orgDoc!.id

    const { data: jobDoc } = await adminClient
      .from('job_documents')
      .insert({ organization_id: orgId, job_id: jobId, file_name: 'photo.jpg', storage_path: 'job/photo.jpg' })
      .select('id')
      .single()
    jobDocumentId = jobDoc!.id

    await adminClient.from('work_orders').insert({
      organization_id: orgId, job_id: jobId, work_order_number: `WO-FK-TEST-${Date.now()}`, status: 'draft', snapshot: {},
    })
    await adminClient.from('estimate_attached_documents').insert({
      organization_id: orgId, estimate_id: estimateId, document_id: orgDocumentId,
    })
    await adminClient.from('invoice_attached_documents').insert({
      organization_id: orgId, invoice_id: invoiceId, job_document_id: jobDocumentId,
    })
    await adminClient.from('property_contacts').insert({
      organization_id: orgId, property_id: propertyId, contact_id: customerId, role: 'owner',
    })
  }, 30000)

  afterAll(async () => {
    if (!adminClient || !orgId) return
    await adminClient.from('property_contacts').delete().eq('organization_id', orgId)
    await adminClient.from('invoice_attached_documents').delete().eq('organization_id', orgId)
    await adminClient.from('estimate_attached_documents').delete().eq('organization_id', orgId)
    await adminClient.from('work_orders').delete().eq('organization_id', orgId)
    await adminClient.from('job_documents').delete().eq('organization_id', orgId)
    await adminClient.from('organization_documents').delete().eq('organization_id', orgId)
    await adminClient.from('properties').delete().eq('organization_id', orgId)
    await adminClient.from('invoices').delete().eq('organization_id', orgId)
    await adminClient.from('jobs').delete().eq('organization_id', orgId)
    await adminClient.from('estimates').delete().eq('organization_id', orgId)
    await adminClient.from('site_surveys').delete().eq('organization_id', orgId)
    await adminClient.from('customers').delete().eq('organization_id', orgId)
    await adminClient.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('work_orders list embed (app/api/work-orders/route.ts)', async () => {
    const { data, error } = await adminClient!
      .from('work_orders')
      .select(`
        id, work_order_number, status, notes, issued_at, created_at, updated_at,
        job:jobs!work_orders_job_id_org_fkey(id, job_number, name, job_address, job_city, job_state, scheduled_start_date, customer:customers!customer_id(id, name, company_name))
      `)
      .eq('organization_id', orgId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].job.id).toBe(jobId)
  })

  it('work_orders detail embed (app/api/work-orders/[id]/route.ts)', async () => {
    const { data: wo } = await adminClient!.from('work_orders').select('id').eq('organization_id', orgId).single()
    const { data, error } = await adminClient!
      .from('work_orders')
      .select(`*, job:jobs!work_orders_job_id_org_fkey(id, job_number, name), vehicles:work_order_vehicles(*)`)
      .eq('id', wo!.id)
      .eq('organization_id', orgId)
      .single()
    expect(error).toBeNull()
    expect(data!.job.id).toBe(jobId)
  })

  it('estimate attachments embed (app/api/estimates/[id]/attachments/route.ts)', async () => {
    const { data, error } = await adminClient!
      .from('estimate_attached_documents')
      .select(`
        document_id, attached_at,
        document:organization_documents!estimate_attached_documents_document_id_org_fkey(id, display_name, file_name, category, expires_on, document_number)
      `)
      .eq('estimate_id', estimateId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].document.id).toBe(orgDocumentId)
  })

  it('invoice attachments embed (app/api/invoices/[id]/attachments/route.ts)', async () => {
    const { data, error } = await adminClient!
      .from('invoice_attached_documents')
      .select(`
        job_document_id, attached_at,
        document:job_documents!invoice_attached_documents_job_document_id_org_fkey(id, file_name, category, mime_type, size_bytes, uploaded_at, notes)
      `)
      .eq('invoice_id', invoiceId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].document.id).toBe(jobDocumentId)
  })

  it('property contact history embed (lib/supabase/properties.ts)', async () => {
    const { data, error } = await adminClient!
      .from('property_contacts')
      .select(
        'id, organization_id, property_id, contact_id, role, is_current, moved_in_date, moved_out_date, notes, created_by, created_at, updated_at, contact:customers!property_contacts_contact_id_org_fkey(id, name, first_name, last_name, email, phone, mobile_phone)',
      )
      .eq('property_id', propertyId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].contact.id).toBe(customerId)
  })

  it('proposal-send credential attachment embed (app/api/proposals/[id]/send/route.ts)', async () => {
    const { data, error } = await adminClient!
      .from('estimate_attached_documents')
      .select(`document:organization_documents!estimate_attached_documents_document_id_org_fkey(id, display_name, file_name, storage_path)`)
      .eq('estimate_id', estimateId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].document.id).toBe(orgDocumentId)
  })

  it('invoice-delivery attachment embed (lib/services/invoice-delivery-service.ts)', async () => {
    const { data, error } = await adminClient!
      .from('invoice_attached_documents')
      .select(`document:job_documents!invoice_attached_documents_job_document_id_org_fkey(id, file_name, mime_type, storage_path)`)
      .eq('invoice_id', invoiceId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].document.id).toBe(jobDocumentId)
  })
})
