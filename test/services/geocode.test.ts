import { describe, expect, it } from 'vitest'
import { parseMapboxFeature } from '@/lib/services/geocode'

/**
 * Mapbox scatters an address across a `context` array and returns the state
 * as a short code like "US-WI". This is the parsing behind both the Use
 * Location button and the Add New Contact address autocomplete.
 */

const feature = (over: Record<string, unknown> = {}) => ({
  id: 'address.1',
  address: '5940',
  text: 'Seminole Centre Court',
  context: [
    { id: 'postcode.1', text: '53711' },
    { id: 'place.2', text: 'Fitchburg' },
    { id: 'region.3', text: 'Wisconsin', short_code: 'US-WI' },
  ],
  ...over,
})

describe('parseMapboxFeature', () => {
  it('pulls street, city, state and zip out of the context array', () => {
    expect(parseMapboxFeature(feature())).toEqual({
      streetAddress: '5940 Seminole Centre Court',
      city: 'Fitchburg',
      state: 'WI',
      zip: '53711',
    })
  })

  it('takes the state from the short code, not the full region name', () => {
    expect(parseMapboxFeature(feature()).state).toBe('WI')
  })

  it('falls back to the region name when Mapbox omits the short code', () => {
    const result = parseMapboxFeature(
      feature({ context: [{ id: 'region.3', text: 'Wisconsin' }] }),
    )
    expect(result.state).toBe('WISCONSIN')
  })

  it('uses locality when there is no place entry', () => {
    const result = parseMapboxFeature(
      feature({ context: [{ id: 'locality.9', text: 'Shorewood Hills' }] }),
    )
    expect(result.city).toBe('Shorewood Hills')
  })

  it('returns empty strings rather than undefined when context is missing', () => {
    expect(parseMapboxFeature({ address: undefined, text: undefined })).toEqual({
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
    })
  })

  it('handles a street with no house number', () => {
    const result = parseMapboxFeature(feature({ address: undefined }))
    expect(result.streetAddress).toBe('Seminole Centre Court')
  })
})
