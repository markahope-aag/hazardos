import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { parseMapboxFeature, type MapboxFeature } from '@/lib/services/geocode'

/**
 * GET /api/geocode/search?q=...
 *
 * Forward-geocodes a partial street address into a short list of suggestions,
 * so typing an address fills in city, state and ZIP instead of the office
 * retyping all four. Gina asked for this as "can we have the address auto
 * populate with google maps (in Marketsharp you put in the address and it
 * self populates the city state and zip)".
 *
 * Proxied through the backend for the same reason as the reverse route: the
 * Mapbox token never reaches the browser, where it would be scrape-able and
 * chargeable against our quota.
 *
 * Returns the same normalized shape the reverse route does, one per
 * suggestion, plus a `label` for display:
 *   { suggestions: [{ id, label, streetAddress, city, state, zip }] }
 */

const searchQuerySchema = z.object({
  // Two characters is the shortest query worth spending a Mapbox call on.
  q: z.string().trim().min(3).max(200),
})

interface MapboxResponse {
  features?: MapboxFeature[]
}

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: searchQuerySchema,
  },
  async (_request, context, _body, query) => {
    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) {
      context.log.error({}, 'MAPBOX_ACCESS_TOKEN not configured')
      // Plain Error so the handler returns a generic 500 rather than leaking
      // "configured" / "not configured" semantics.
      throw new Error('Geocoding service not configured')
    }

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.q)}.json` +
      `?access_token=${encodeURIComponent(token)}` +
      `&types=address&autocomplete=true&limit=5&language=en&country=us,ca`

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    } catch (err) {
      context.log.error({ err }, 'Mapbox search request failed')
      throw new SecureError('BAD_REQUEST', 'Address lookup timed out, try again')
    }

    if (!response.ok) {
      // Never echo Mapbox's body: on auth errors it can name the token's
      // account. Log server-side, stay generic to the client.
      const text = await response.text().catch(() => '')
      context.log.error(
        { status: response.status, sample: text.slice(0, 200) },
        'Mapbox search returned non-2xx',
      )
      if (response.status === 401 || response.status === 403) {
        throw new Error('Mapbox auth failed')
      }
      if (response.status === 429) {
        throw new SecureError('BAD_REQUEST', 'Address lookup rate limit reached, try again shortly')
      }
      throw new SecureError('BAD_REQUEST', 'Address lookup failed')
    }

    const data = (await response.json()) as MapboxResponse

    const suggestions = (data.features ?? [])
      .map((feature, i) => ({
        id: feature.id ?? `suggestion-${i}`,
        label: feature.place_name ?? '',
        ...parseMapboxFeature(feature),
      }))
      // A suggestion with no street address cannot fill the form, so it is
      // only noise in the list.
      .filter((s) => s.streetAddress)

    return NextResponse.json({ suggestions })
  },
)
