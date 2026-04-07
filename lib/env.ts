import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

// Only validate on server side (not during build or client)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Missing required environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    // Don't crash during build, but warn loudly
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables')
    }
  }
}

export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
}
