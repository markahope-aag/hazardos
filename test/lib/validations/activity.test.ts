import { describe, it, expect } from 'vitest'
import {
  activityEntityTypeSchema,
  manualActivityTypeSchema,
  callDirectionSchema,
  createManualActivitySchema,
  activityListQuerySchema,
} from '@/lib/validations/activity'

describe('activityEntityTypeSchema', () => {
  it('accepts valid entity types', () => {
    const types = ['customer', 'job', 'estimate', 'invoice', 'proposal', 'opportunity']
    for (const type of types) {
      const result = activityEntityTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid entity type', () => {
    const result = activityEntityTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('manualActivityTypeSchema', () => {
  it('accepts note type', () => {
    const result = manualActivityTypeSchema.safeParse('note')
    expect(result.success).toBe(true)
  })

  it('accepts call type', () => {
    const result = manualActivityTypeSchema.safeParse('call')
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = manualActivityTypeSchema.safeParse('email')
    expect(result.success).toBe(false)
  })
})

describe('callDirectionSchema', () => {
  it('accepts inbound', () => {
    const result = callDirectionSchema.safeParse('inbound')
    expect(result.success).toBe(true)
  })

  it('accepts outbound', () => {
    const result = callDirectionSchema.safeParse('outbound')
    expect(result.success).toBe(true)
  })

  it('rejects invalid direction', () => {
    const result = callDirectionSchema.safeParse('missed')
    expect(result.success).toBe(false)
  })
})

describe('createManualActivitySchema', () => {
  it('accepts valid note activity', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'note',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Customer inquiry about pricing',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid call activity', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'call',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      call_direction: 'inbound',
      call_duration: 300,
    })
    expect(result.success).toBe(true)
  })

  it('requires content for note type', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'note',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('requires call_direction for call type', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'call',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('requires type', () => {
    const result = createManualActivitySchema.safeParse({
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('requires entity_type', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'note',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for entity_id', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'note',
      entity_type: 'customer',
      entity_id: 'not-a-uuid',
      content: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects content exceeding max length', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'note',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts call_duration of 0', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'call',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      call_direction: 'outbound',
      call_duration: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative call_duration', () => {
    const result = createManualActivitySchema.safeParse({
      type: 'call',
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      call_direction: 'outbound',
      call_duration: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('activityListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = activityListQuerySchema.safeParse({
      entity_type: 'customer',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = activityListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = activityListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('allows passthrough of additional fields', () => {
    const result = activityListQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})
