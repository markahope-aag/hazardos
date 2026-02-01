import { createClient } from '@/lib/supabase/server'
import type { JobChangeOrder, AddChangeOrderInput } from '@/types/jobs'

export class JobChangeOrdersService {
  static async add(jobId: string, input: AddChangeOrderInput): Promise<JobChangeOrder> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Generate change order number
    const { data: existing } = await supabase
      .from('job_change_orders')
      .select('change_order_number')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)

    const nextNum = existing?.length
      ? parseInt(existing[0].change_order_number.split('-').pop() || '0') + 1
      : 1

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

    if (error) throw error
    return data
  }

  static async approve(id: string): Promise<JobChangeOrder> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    if (error) throw error
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

    if (error) throw error
    return data
  }
}
