import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server-auth'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import type { JobChangeOrder, AddChangeOrderInput } from '@/types/jobs'

export class JobChangeOrdersService {
  static async add(jobId: string, input: AddChangeOrderInput): Promise<JobChangeOrder> {
    const supabase = await createClient()
    const user = await getCurrentUser()

    // Generate change order number: <job_number>-CO01, -CO02, ...
    const { data: existing } = await supabase
      .from('job_change_orders')
      .select('change_order_number')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)

    // Read the counter off the -CO<n> suffix. Splitting on '-' and parsing the
    // last segment does not work: the segment is "CO01", and parseInt('CO01')
    // is NaN, so every change order after the first was numbered "-CONaN" and
    // collided with the one before it.
    const previousNumber = existing?.length
      ? Number(/-CO(\d+)$/.exec(existing[0].change_order_number)?.[1] ?? 0)
      : 0
    const nextNum = previousNumber + 1

    const { data: job } = await supabase
      .from('jobs')
      .select('job_number')
      .eq('id', jobId)
      .single()

    const coNumber = `${job?.job_number}-CO${nextNum.toString().padStart(2, '0')}`

    const { data, error } = await supabase
      .from('job_change_orders')
      .insert({
        job_id: jobId,
        change_order_number: coNumber,
        description: input.description,
        reason: input.reason,
        amount: input.amount,
        status: 'pending',
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create change order')
    return data
  }

  static async approve(id: string): Promise<JobChangeOrder> {
    const supabase = await createClient()
    const user = await getCurrentUser()

    const { data, error } = await supabase
      .from('job_change_orders')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update change order')
    await JobChangeOrdersService.recomputeJobTotals(data.job_id)
    return data
  }

  static async reject(id: string): Promise<JobChangeOrder> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_change_orders')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update change order')
    // Recompute even on reject: this also covers reversing a change order
    // that was previously approved, not just the common pending->rejected path.
    await JobChangeOrdersService.recomputeJobTotals(data.job_id)
    return data
  }

  /**
   * Keeps jobs.change_order_amount/final_amount in step with the sum of
   * approved change orders. Nothing else does this — the columns are plain
   * read-write numerics, not generated/trigger-maintained (see
   * calculate_completion_variance_by_job, which recomputes cost/margin from
   * time entries and materials, not change orders).
   */
  private static async recomputeJobTotals(jobId: string): Promise<void> {
    const supabase = await createClient()

    const [{ data: approved, error: approvedError }, { data: job, error: jobError }] = await Promise.all([
      supabase.from('job_change_orders').select('amount').eq('job_id', jobId).eq('status', 'approved'),
      supabase.from('jobs').select('contract_amount').eq('id', jobId).single(),
    ])

    if (approvedError) throwDbError(approvedError, 'sum approved change orders')
    if (jobError) throwDbError(jobError, 'fetch job contract amount')

    const changeOrderAmount = (approved ?? []).reduce((sum, co) => sum + Number(co.amount), 0)
    const contractAmount = Number(job?.contract_amount ?? 0)

    const { error } = await supabase
      .from('jobs')
      .update({
        change_order_amount: changeOrderAmount,
        final_amount: contractAmount + changeOrderAmount,
      })
      .eq('id', jobId)

    if (error) throwDbError(error, 'update job change order totals')
  }
}
