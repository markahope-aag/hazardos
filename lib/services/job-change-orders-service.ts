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
    return data
  }
}
