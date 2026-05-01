import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/geocode/reverse?lat=...&lng=...
 *
 * Reverse-geocodes a coordinate pair to a US street address using
 * Mapbox's Geocoding API. Proxied through the backend so the access
 * token never reaches the browser — a public token in client code
 * would be scrape-able and abusable against our Mapbox quota even
 * with URL restrictions.
 *
 * Returns a normalized shape that the mobile property form can drop
 * straight into its store, regardless of which geocoder is used:
 *   { streetAddress, city, state, zip }
 *
 * Mapbox response (abbreviated):
 *   features[0] = { address: "123", text: "Main St", context: [
 *     { id: "postcode.x", text: "62701" },
 *     { id: "place.y", text: "Springfield" },
 *     { id: "region.z", short_code: "US-IL" },
 *   ]}
 */

const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

interface MapboxFeature {
  id?: string
  place_type?: string[]
  address?: string
  text?: string
  place_name?: string
  context?: Array<{ id?: string; text?: string; short_code?: string }>
}

interface MapboxResponse {
  features?: MapboxFeature[]
}

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: reverseQuerySchema,
  },
  async (_request, context, _body, query) => {
    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) {
      context.log.error({}, 'MAPBOX_ACCESS_TOKEN not configured')
      // Throw a plain Error so the handler returns a generic 500
      // rather than leaking "configured" / "not configured" semantics.
      throw new Error('Geocoding service not configured')
    }

    // Mapbox expects {lng},{lat} order in the path. `types` filters to
    // address-relevant features so we don't get back a country-level
    // hit when the user is standing in a parking lot. `limit=1` keeps
    // the payload small; if Mapbox can't pin a precise address we
    // still get the best guess at the requested precision.
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query.lng},${query.lat}.json` +
      `?access_token=${encodeURIComponent(token)}` +
      `&types=address,place,postcode,region` +
      `&limit=1&language=en&country=us,ca`

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    } catch (err) {
      context.log.error({ err }, 'Mapbox request failed')
      throw new SecureError('BAD_REQUEST', 'Geocoding request timed out — try again')
    }

    if (!response.ok) {
      // Don't leak Mapbox's body — it sometimes echoes the access
      // token's account on auth errors. Log it server-side, return
      // generic to the client.
      const text = await response.text().catch(() => '')
      context.log.error(
        { status: response.status, sample: text.slice(0, 200) },
        'Mapbox returned non-2xx',
      )
      if (response.status === 401 || response.status === 403) {
        // Our token is bad — that's a server problem. Throw plain so
        // the handler returns 500 and we don't tell the client whose
        // auth failed.
        throw new Error('Mapbox auth failed')
      }
      if (response.status === 429) {
        throw new SecureError(
          'BAD_REQUEST',
          'Geocoding rate limit reached — try again in a moment',
        )
      }
      throw new SecureError('BAD_REQUEST', 'Geocoding request failed')
    }

    const data = (await response.json()) as MapboxResponse
    const feature = data.features?.[0]

    if (!feature) {
      return NextResponse.json({
        streetAddress: '',
        city: '',
        state: '',
        zip: '',
        placeName: null,
      })
    }

    const houseNumber = feature.address ?? ''
    const street = feature.text ?? ''
    const streetAddress = [houseNumber, street].filter(Boolean).join(' ').trim()

    const ctx = feature.context ?? []
    const city =
      ctx.find((c) => c.id?.startsWith('place.'))?.text
      ?? ctx.find((c) => c.id?.startsWith('locality.'))?.text
      ?? ''

    // short_code looks like "US-IL". Pull just the post-dash piece.
    const regionCtx = ctx.find((c) => c.id?.startsWith('region.'))
    const state =
      regionCtx?.short_code?.split('-')[1]
      ?? regionCtx?.text
      ?? ''

    const zip = ctx.find((c) => c.id?.startsWith('postcode.'))?.text ?? ''

    return NextResponse.json({
      streetAddress,
      city,
      state,
      zip,
      placeName: feature.place_name ?? null,
    })
  },
)
