import { z } from 'zod'

// Property types for AI estimate
export const propertyTypeSchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'multi-family',
  'government',
  'other',
])

// Hazard types
export const hazardTypeSchema = z.enum([
  'asbestos',
  'lead',
  'mold',
  'radon',
  'silica',
  'pcb',
  'other',
])

// AI estimate input
export const aiEstimateSchema = z.object({
  hazard_types: z.array(hazardTypeSchema).min(1, 'At least one hazard type is required'),
  property_type: propertyTypeSchema.optional(),
  square_footage: z.number().min(0).optional(),
  photos: z.array(z.string()).optional(),
  site_survey_notes: z.string().max(5000).optional(),
  customer_notes: z.string().max(5000).optional(),
})

// Photo analysis context
export const photoAnalysisContextSchema = z.object({
  property_type: propertyTypeSchema.optional(),
  known_hazards: z.array(hazardTypeSchema).optional(),
  additional_context: z.string().max(1000).optional(),
})

// Single photo analysis
export const singlePhotoAnalysisSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  context: photoAnalysisContextSchema.optional(),
})

// Multiple photo analysis
export const multiplePhotoAnalysisSchema = z.object({
  images: z.array(z.object({
    base64: z.string().min(1),
    context: photoAnalysisContextSchema.optional(),
  })).min(1, 'At least one image is required'),
})

// Combined photo analysis (either single or multiple)
export const photoAnalysisSchema = z.union([
  singlePhotoAnalysisSchema,
  multiplePhotoAnalysisSchema,
])

// Transcription context type
export const transcriptionContextTypeSchema = z.enum([
  'site_survey_note',
  'job_note',
  'customer_note',
])

// Voice transcription context
export const transcriptionContextSchema = z.object({
  context_type: transcriptionContextTypeSchema.optional(),
  entity_id: z.string().uuid().optional(),
})

// Voice transcription (JSON body)
export const voiceTranscribeSchema = z.object({
  audio: z.string().min(1, 'Audio data is required'),
  format: z.string().max(20).optional().default('webm'),
  context: transcriptionContextSchema.optional(),
})

// Voice transcription query
export const voiceTranscriptionQuerySchema = z.object({
  limit: z.string().transform(Number).optional(),
  user_only: z.string().optional(),
}).passthrough()

// Export types
export type AIEstimateInput = z.infer<typeof aiEstimateSchema>
export type PhotoAnalysisInput = z.infer<typeof photoAnalysisSchema>
export type VoiceTranscribeInput = z.infer<typeof voiceTranscribeSchema>
