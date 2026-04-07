import { createClient } from '@/lib/supabase/server'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import type { JobNote, AddJobNoteInput } from '@/types/jobs'

export class JobNotesService {
  static async add(jobId: string, input: AddJobNoteInput): Promise<JobNote> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('job_notes')
      .insert({
        job_id: jobId,
        note_type: input.note_type,
        content: input.content,
        attachments: input.attachments || [],
        is_internal: input.is_internal ?? true,
        created_by: user?.id,
      })
      .select(`
        *,
        author:profiles(id, full_name)
      `)
      .single()

    if (error) throwDbError(error, 'create job note')
    return {
      ...data,
      author: Array.isArray(data.author) ? data.author[0] : data.author,
    }
  }

  static async remove(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_notes')
      .delete()
      .eq('id', id)

    if (error) throwDbError(error, 'delete job note')
  }
}
