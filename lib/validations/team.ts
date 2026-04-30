import { z } from 'zod'
import { ROLE } from '@/lib/auth/roles'

// Roles an admin can assign through the Team UI. Platform roles are
// intentionally omitted — those are set by the platform operators, not
// tenant admins managing their own org.
export const assignableRoleSchema = z.enum([
  ROLE.TENANT_OWNER,
  ROLE.ADMIN,
  ROLE.ESTIMATOR,
  ROLE.TECHNICIAN,
  ROLE.VIEWER,
])

export const updateTeamMemberSchema = z
  .object({
    first_name: z.string().trim().max(100).optional(),
    last_name: z.string().trim().max(100).optional(),
    phone: z
      .string()
      .trim()
      .max(40)
      .regex(/^[\d\s+()\-.]*$/, 'Invalid phone number')
      .optional()
      .nullable(),
    role: assignableRoleSchema.optional(),
  })
  .refine(
    (v) =>
      v.first_name !== undefined ||
      v.last_name !== undefined ||
      v.phone !== undefined ||
      v.role !== undefined,
    { message: 'At least one field must be provided' },
  )

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>
