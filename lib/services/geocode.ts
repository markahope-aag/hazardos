/**
 * Mapbox response parsing, shared by the forward and reverse geocode routes.
 *
 * Mapbox scatters the parts of an address across a `context` array keyed by
 * prefixed ids, and returns the state as a short code like "US-WI". Both
 * routes need the same normalized shape, so the parsing lives here rather
 * than being written twice and drifting.
 */

export interface MapboxFeature {
  id?: string
  address?: string
  text?: string
  place_name?: string
  context?: Array<{ id?: string; text?: string; short_code?: string }>
}

export interface ParsedAddress {
  streetAddress: string
  city: string
  state: string
  zip: string
}

/** Normalize one Mapbox feature into the shape our address forms consume. */
export function parseMapboxFeature(feature: MapboxFeature): ParsedAddress {
  const ctx = feature.context ?? []

  const streetAddress = [feature.address ?? '', feature.text ?? '']
    .filter(Boolean)
    .join(' ')
    .trim()

  const city =
    ctx.find((c) => c.id?.startsWith('place.'))?.text
    ?? ctx.find((c) => c.id?.startsWith('locality.'))?.text
    ?? ''

  // short_code looks like "US-WI"; take the part after the dash. Fall back to
  // the full region name when Mapbox omits the code, which is better than
  // nothing even though the form wants two letters.
  const regionCtx = ctx.find((c) => c.id?.startsWith('region.'))
  const state = regionCtx?.short_code?.split('-')[1] ?? regionCtx?.text ?? ''

  const zip = ctx.find((c) => c.id?.startsWith('postcode.'))?.text ?? ''

  return { streetAddress, city, state: state.toUpperCase(), zip }
}
