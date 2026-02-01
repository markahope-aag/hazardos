import { createClient } from '@/lib/supabase/server'
import type {
  JobEquipment,
  JobMaterial,
  JobDisposal,
  AddJobEquipmentInput,
  AddJobMaterialInput,
  AddJobDisposalInput,
} from '@/types/jobs'

export class JobResourcesService {
  // ========== EQUIPMENT ==========

  static async addEquipment(jobId: string, input: AddJobEquipmentInput): Promise<JobEquipment> {
    const supabase = await createClient()

    // Calculate rental days and total if rental
    let rental_days: number | undefined
    let rental_total: number | undefined

    if (input.is_rental && input.rental_start_date && input.rental_end_date && input.rental_rate_daily) {
      const start = new Date(input.rental_start_date)
      const end = new Date(input.rental_end_date)
      rental_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      rental_total = rental_days * input.rental_rate_daily * (input.quantity || 1)
    }

    const { data, error } = await supabase
      .from('job_equipment')
      .insert({
        job_id: jobId,
        equipment_name: input.equipment_name,
        equipment_type: input.equipment_type,
        quantity: input.quantity || 1,
        is_rental: input.is_rental || false,
        rental_rate_daily: input.rental_rate_daily,
        rental_start_date: input.rental_start_date,
        rental_end_date: input.rental_end_date,
        rental_days,
        rental_total,
        notes: input.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateEquipmentStatus(id: string, status: string): Promise<JobEquipment> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_equipment')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteEquipment(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_equipment')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== MATERIALS ==========

  static async addMaterial(jobId: string, input: AddJobMaterialInput): Promise<JobMaterial> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_materials')
      .insert({
        job_id: jobId,
        material_name: input.material_name,
        material_type: input.material_type,
        quantity_estimated: input.quantity_estimated,
        unit: input.unit,
        unit_cost: input.unit_cost,
        total_cost: input.quantity_estimated && input.unit_cost
          ? input.quantity_estimated * input.unit_cost
          : undefined,
        notes: input.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateMaterialUsage(id: string, quantity_used: number): Promise<JobMaterial> {
    const supabase = await createClient()

    // Get the material to calculate total cost
    const { data: material } = await supabase
      .from('job_materials')
      .select('unit_cost')
      .eq('id', id)
      .single()

    const total_cost = material?.unit_cost ? quantity_used * material.unit_cost : undefined

    const { data, error } = await supabase
      .from('job_materials')
      .update({ quantity_used, total_cost })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteMaterial(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_materials')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== DISPOSAL ==========

  static async addDisposal(jobId: string, input: AddJobDisposalInput): Promise<JobDisposal> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_disposal')
      .insert({
        job_id: jobId,
        hazard_type: input.hazard_type,
        disposal_type: input.disposal_type,
        quantity: input.quantity,
        unit: input.unit,
        manifest_number: input.manifest_number,
        manifest_date: input.manifest_date,
        disposal_facility_name: input.disposal_facility_name,
        disposal_facility_address: input.disposal_facility_address,
        disposal_cost: input.disposal_cost,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDisposal(id: string, updates: Partial<AddJobDisposalInput>): Promise<JobDisposal> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_disposal')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteDisposal(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_disposal')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
