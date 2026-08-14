import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { FollowUpsService } from '@/lib/services/follow-ups-service'
import {
  createFollowUpSchema,
  followUpListQuerySchema,
} from '@/lib/validations/follow-ups'

/**
 * GET /api/follow-ups
 * List follow-ups for the current org. Defaults to pending only.
 *
 * With `include_entity=true` each row also carries the label and link of the
 * thing it hangs off, which is what the cross-entity work queue needs. The
 * per-entity panels already know their own context, so they leave it off and
 * skip the extra lookups.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema: followUpListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    if (query.include_entity) {
      const { items, total } = await FollowUpsService.queue(query)
      return NextResponse.json({ follow_ups: items, total })
    }
    const result = await FollowUpsService.list(query)
    return NextResponse.json(result)
  }
)

/**
 * POST /api/follow-ups
 * Schedule a new follow-up against any supported entity.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createFollowUpSchema,
  },
  async (_request, _context, body) => {
    const followUp = await FollowUpsService.create(body)
    return NextResponse.json({ follow_up: followUp }, { status: 201 })
  }
)
