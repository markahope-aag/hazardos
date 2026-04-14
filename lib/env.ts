import { z } from 'zod'

// Required at runtime in all environments
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

// Required only on the server (Node / Edge)
const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

// Optional but validated-if-present (shape checks only)
const optionalServerSchema = z.object({
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
})

function isServer() {
  return typeof window === 'undefined'
}

function validate() {
  if (process.env.NODE_ENV === 'test') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return // build-time, env may be partial

  const schema = isServer() ? serverSchema.merge(optionalServerSchema) : publicSchema
  const result = schema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    const msg = `Environment validation failed:\n${issues}`

    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
    console.error(msg)
  }
}

validate()

export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
}
