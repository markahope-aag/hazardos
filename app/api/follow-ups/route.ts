import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { FollowUpsService } from '@/lib/services/follow-ups-service'
import {
  createFollowUpSchema,
  followUpListQuerySchema,
} from '@/lib/validations/follow-ups'

/**
 * GET /api/follow-ups
 * List follow-ups for the current org. Defaults to pending only.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: followUpListQuerySchema,
  },
  async (_request, _context, _body, query) => {
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
    bodySchema: createFollowUpSchema,
  },
  async (_request, _context, body) => {
    const followUp = await FollowUpsService.create(body)
    return NextResponse.json({ follow_up: followUp }, { status: 201 })
  }
)
