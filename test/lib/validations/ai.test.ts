import { describe, it, expect } from 'vitest'
import {
  propertyTypeSchema,
  hazardTypeSchema,
  aiEstimateSchema,
  photoAnalysisContextSchema,
  singlePhotoAnalysisSchema,
  multiplePhotoAnalysisSchema,
  photoAnalysisSchema,
  transcriptionContextTypeSchema,
  transcriptionContextSchema,
  voiceTranscribeSchema,
  voiceTranscriptionQuerySchema,
} from '@/lib/validations/ai'

describe('propertyTypeSchema', () => {
  it('accepts valid property types', () => {
    const types = ['residential', 'commercial', 'industrial', 'multi-family', 'government', 'other']
    for (const type of types) {
      const result = propertyTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid property type', () => {
    const result = propertyTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('hazardTypeSchema', () => {
  it('accepts valid hazard types', () => {
    const types = ['asbestos', 'lead', 'mold', 'radon', 'silica', 'pcb', 'other']
    for (const type of types) {
      const result = hazardTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid hazard type', () => {
    const result = hazardTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('aiEstimateSchema', () => {
  it('accepts valid AI estimate input', () => {
    const result = aiEstimateSchema.safeParse({
      hazard_types: ['asbestos', 'lead'],
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one hazard type', () => {
    const result = aiEstimateSchema.safeParse({
      hazard_types: [],
    })
    expect(result.success).toBe(false)
  })

  it('requires hazard_types array', () => {
    const result = aiEstimateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields', () => {
    const result = aiEstimateSchema.safeParse({
      hazard_types: ['asbestos'],
      property_type: 'commercial',
      square_footage: 5000,
      photos: ['photo1.jpg', 'photo2.jpg'],
      site_survey_notes: 'Notes from survey',
      customer_notes: 'Customer preferences',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative square_footage', () => {
    const result = aiEstimateSchema.safeParse({
      hazard_types: ['asbestos'],
      square_footage: -100,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero square_footage', () => {
    const result = aiEstimateSchema.safeParse({
      hazard_types: ['asbestos'],
      square_footage: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects notes exceeding max length', () => {
    const result = aiEstimateSchema.safeParse({
      hazard_types: ['asbestos'],
      site_survey_notes: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })
})

describe('photoAnalysisContextSchema', () => {
  it('accepts valid context', () => {
    const result = photoAnalysisContextSchema.safeParse({
      property_type: 'residential',
      known_hazards: ['asbestos', 'lead'],
      additional_context: 'Basement area',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = photoAnalysisContextSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects additional_context exceeding max length', () => {
    const result = photoAnalysisContextSchema.safeParse({
      additional_context: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('singlePhotoAnalysisSchema', () => {
  it('accepts valid single photo', () => {
    const result = singlePhotoAnalysisSchema.safeParse({
      image: 'base64encodedimagedata',
    })
    expect(result.success).toBe(true)
  })

  it('requires image', () => {
    const result = singlePhotoAnalysisSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty image', () => {
    const result = singlePhotoAnalysisSchema.safeParse({
      image: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional context', () => {
    const result = singlePhotoAnalysisSchema.safeParse({
      image: 'base64data',
      context: {
        property_type: 'commercial',
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('multiplePhotoAnalysisSchema', () => {
  it('accepts valid multiple photos', () => {
    const result = multiplePhotoAnalysisSchema.safeParse({
      images: [
        { base64: 'image1data' },
        { base64: 'image2data' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one image', () => {
    const result = multiplePhotoAnalysisSchema.safeParse({
      images: [],
    })
    expect(result.success).toBe(false)
  })

  it('requires images array', () => {
    const result = multiplePhotoAnalysisSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects images with empty base64', () => {
    const result = multiplePhotoAnalysisSchema.safeParse({
      images: [{ base64: '' }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts context for each image', () => {
    const result = multiplePhotoAnalysisSchema.safeParse({
      images: [
        { base64: 'image1', context: { property_type: 'residential' } },
        { base64: 'image2' },
      ],
    })
    expect(result.success).toBe(true)
  })
})

describe('photoAnalysisSchema', () => {
  it('accepts single photo format', () => {
    const result = photoAnalysisSchema.safeParse({
      image: 'base64data',
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple photos format', () => {
    const result = photoAnalysisSchema.safeParse({
      images: [{ base64: 'image1' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid format', () => {
    const result = photoAnalysisSchema.safeParse({
      invalid: 'data',
    })
    expect(result.success).toBe(false)
  })
})

describe('transcriptionContextTypeSchema', () => {
  it('accepts valid context types', () => {
    const types = ['site_survey_note', 'job_note', 'customer_note']
    for (const type of types) {
      const result = transcriptionContextTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid context type', () => {
    const result = transcriptionContextTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('transcriptionContextSchema', () => {
  it('accepts valid context', () => {
    const result = transcriptionContextSchema.safeParse({
      context_type: 'job_note',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = transcriptionContextSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('voiceTranscribeSchema', () => {
  it('accepts valid transcription input', () => {
    const result = voiceTranscribeSchema.safeParse({
      audio: 'base64audiodata',
    })
    expect(result.success).toBe(true)
  })

  it('requires audio', () => {
    const result = voiceTranscribeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty audio', () => {
    const result = voiceTranscribeSchema.safeParse({
      audio: '',
    })
    expect(result.success).toBe(false)
  })

  it('defaults format to webm', () => {
    const result = voiceTranscribeSchema.safeParse({
      audio: 'data',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.format).toBe('webm')
    }
  })

  it('accepts custom format', () => {
    const result = voiceTranscribeSchema.safeParse({
      audio: 'data',
      format: 'mp3',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.format).toBe('mp3')
    }
  })

  it('accepts optional context', () => {
    const result = voiceTranscribeSchema.safeParse({
      audio: 'data',
      context: {
        context_type: 'job_note',
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('voiceTranscriptionQuerySchema', () => {
  it('accepts valid query', () => {
    const result = voiceTranscriptionQuerySchema.safeParse({
      limit: '10',
      user_only: 'true',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = voiceTranscriptionQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms limit to number', () => {
    const result = voiceTranscriptionQuerySchema.safeParse({
      limit: '25',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
    }
  })

  it('allows passthrough of additional fields', () => {
    const result = voiceTranscriptionQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})
