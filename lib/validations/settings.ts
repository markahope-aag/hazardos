import { z } from 'zod'

// Labor rate
export const createLaborRateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  rate_per_hour: z.number().positive('Rate must be positive'),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional().default(false),
})

export const updateLaborRateSchema = z.object({
  id: z.string().uuid('Invalid ID'),
  name: z.string().min(1).max(255).optional(),
  rate_per_hour: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
})

export const deleteLaborRateQuerySchema = z.object({
  id: z.string().uuid('Invalid ID'),
})

// Disposal fee
export const createDisposalFeeSchema = z.object({
  hazard_type: z.string().min(1, 'Hazard type is required').max(100),
  cost_per_cubic_yard: z.number().min(0, 'Cost must be non-negative'),
  description: z.string().max(500).optional(),
})

export const updateDisposalFeeSchema = z.object({
  id: z.string().uuid('Invalid ID'),
  hazard_type: z.string().min(1).max(100).optional(),
  cost_per_cubic_yard: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
})

export const deleteDisposalFeeQuerySchema = z.object({
  id: z.string().uuid('Invalid ID'),
})

// Material cost
export const createMaterialCostSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  cost_per_unit: z.number().min(0, 'Cost must be non-negative'),
  unit: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
})

export const updateMaterialCostSchema = z.object({
  id: z.string().uuid('Invalid ID'),
  name: z.string().min(1).max(255).optional(),
  cost_per_unit: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
})

export const deleteMaterialCostQuerySchema = z.object({
  id: z.string().uuid('Invalid ID'),
})

// Travel rate
export const createTravelRateSchema = z.object({
  min_miles: z.number().min(0, 'Min miles must be non-negative'),
  max_miles: z.number().min(0).optional().nullable(),
  flat_fee: z.number().min(0).optional().nullable(),
  per_mile_rate: z.number().min(0).optional().nullable(),
  description: z.string().max(500).optional(),
})

export const updateTravelRateSchema = z.object({
  id: z.string().uuid('Invalid ID'),
  min_miles: z.number().min(0).optional(),
  max_miles: z.number().min(0).optional().nullable(),
  flat_fee: z.number().min(0).optional().nullable(),
  per_mile_rate: z.number().min(0).optional().nullable(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
})

export const deleteTravelRateQuerySchema = z.object({
  id: z.string().uuid('Invalid ID'),
})

// Equipment rate
export const createEquipmentRateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  rate_per_day: z.number().min(0, 'Rate must be non-negative'),
  description: z.string().max(500).optional(),
})

export const updateEquipmentRateSchema = z.object({
  id: z.string().uuid('Invalid ID'),
  name: z.string().min(1).max(255).optional(),
  rate_per_day: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
})

export const deleteEquipmentRateQuerySchema = z.object({
  id: z.string().uuid('Invalid ID'),
})

// Pricing settings
export const updatePricingSettingsSchema = z.object({
  default_markup_percent: z.number().min(0).max(100).optional(),
  minimum_markup_percent: z.number().min(0).max(100).optional(),
  maximum_markup_percent: z.number().min(0).max(100).optional(),
  office_address_line1: z.string().optional().nullable(),
  office_city: z.string().optional().nullable(),
  office_state: z.string().optional().nullable(),
  office_zip: z.string().optional().nullable(),
})

// Export types
export type CreateLaborRateInput = z.infer<typeof createLaborRateSchema>
export type UpdateLaborRateInput = z.infer<typeof updateLaborRateSchema>
export type CreateDisposalFeeInput = z.infer<typeof createDisposalFeeSchema>
export type UpdateDisposalFeeInput = z.infer<typeof updateDisposalFeeSchema>
export type CreateMaterialCostInput = z.infer<typeof createMaterialCostSchema>
export type UpdateMaterialCostInput = z.infer<typeof updateMaterialCostSchema>
export type CreateTravelRateInput = z.infer<typeof createTravelRateSchema>
export type UpdateTravelRateInput = z.infer<typeof updateTravelRateSchema>
export type CreateEquipmentRateInput = z.infer<typeof createEquipmentRateSchema>
export type UpdateEquipmentRateInput = z.infer<typeof updateEquipmentRateSchema>
