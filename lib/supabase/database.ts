import { createClient } from './client'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('DatabaseService')

function getSupabaseClient() {
  try {
    return createClient()
  } catch (error) {
    log.warn(
      { error: formatError(error, 'SUPABASE_CLIENT_INIT_ERROR') },
      'Supabase client not available'
    )
    return null
  }
}

export const supabase = getSupabaseClient()

export class DatabaseService {
  static async testConnection() {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not configured. Please check your environment variables.',
      }
    }

    try {
      const { error } = await supabase.from('profiles').select('count').limit(1)
      if (error) throw error
      return { success: true, message: 'Database connection successful' }
    } catch (error) {
      return {
        success: false,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
}
