import { describe, expect, it } from 'vitest'
import {
  buildOppProjectDescription,
  type OppLineItem,
} from '@/lib/services/opp-description'

/**
 * Gina's note on the OPP paperwork: the project description has to carry a
 * quantity and a material type, the way the proposal words it. The old
 * prefill emitted "Hazards: asbestos. Containment level: type ii.", which
 * carries neither, so the office retyped the field every time.
 */

const lineItem = (over: Partial<OppLineItem> = {}): OppLineItem => ({
  item_type: 'labor',
  description: 'Sheet vinyl flooring, lower level kitchen',
  quantity: 225,
  unit: 'sq ft',
  notes: null,
  is_included: true,
  ...over,
})

describe('buildOppProjectDescription', () => {
  it('prefers the estimate scope of work, because that is the proposal text', () => {
    // Arrange
    const scope =
      'Removal and disposal of approximately 225 sq feet of asbestos containing two layers of sheet vinyl in the lower level kitchen.'

    // Act
    const result = buildOppProjectDescription({
      estimateScopeOfWork: scope,
      lineItems: [lineItem()],
      hazardTypes: ['asbestos'],
    })

    // Assert
    expect(result).toEqual({ text: scope, source: 'estimate_scope' })
  })

  it('falls back to the estimate project description when scope is blank', () => {
    const result = buildOppProjectDescription({
      estimateScopeOfWork: '   ',
      estimateProjectDescription: 'Vermiculite removal, attic.',
      lineItems: [lineItem()],
    })

    expect(result.source).toBe('estimate_project_description')
    expect(result.text).toBe('Vermiculite removal, attic.')
  })

  it('composes quantity, unit, and material from line items', () => {
    const result = buildOppProjectDescription({
      lineItems: [
        lineItem(),
        lineItem({ description: 'TSI, basement', quantity: 100, unit: 'linear ft' }),
      ],
    })

    expect(result.source).toBe('estimate_line_items')
    expect(result.text).toBe(
      'Removal and disposal of approximately 225 sq ft of Sheet vinyl flooring, lower level kitchen; 100 linear ft of TSI, basement.',
    )
  })

  it('strips numeric(10,2) padding from quantities', () => {
    const result = buildOppProjectDescription({
      lineItems: [lineItem({ quantity: '225.00' })],
    })

    expect(result.text).toContain('225 sq ft')
    expect(result.text).not.toContain('225.00')
  })

  it('omits line items the office excluded from the estimate', () => {
    const result = buildOppProjectDescription({
      lineItems: [
        lineItem({ description: 'Included work' }),
        lineItem({ description: 'Excluded work', is_included: false }),
      ],
    })

    expect(result.text).toContain('Included work')
    expect(result.text).not.toContain('Excluded work')
  })

  it('leaves disposal, travel, permit and testing lines out of the scope text', () => {
    const result = buildOppProjectDescription({
      lineItems: [
        lineItem(),
        lineItem({ item_type: 'disposal', description: 'Disposal fees', quantity: 2, unit: 'loads' }),
        lineItem({ item_type: 'travel', description: 'Travel', quantity: 60, unit: 'miles' }),
        lineItem({ item_type: 'permit', description: 'DNR permit', quantity: 1, unit: null }),
        lineItem({ item_type: 'testing', description: 'Clearance testing', quantity: 3, unit: 'samples' }),
      ],
    })

    expect(result.text).toBe(
      'Removal and disposal of approximately 225 sq ft of Sheet vinyl flooring, lower level kitchen.',
    )
  })

  it('does not write "3 each of" when the unit is the column default', () => {
    const result = buildOppProjectDescription({
      lineItems: [lineItem({ description: 'Glovebag', quantity: 3, unit: 'each' })],
      hazardTypes: ['asbestos'],
    })

    expect(result.text).not.toContain('each of')
    expect(result.source).toBe('job')
  })

  // Found by running the builder over real seeded estimates: their labor
  // lines are priced in hours and their materials in "lot". Left alone,
  // the wizard would have put "approximately 11 hour of Asbestos
  // abatement labor" on a Wisconsin DHS form.
  it('never presents labor hours as a quantity of material', () => {
    const result = buildOppProjectDescription({
      lineItems: [
        lineItem({ description: 'Asbestos abatement labor', quantity: 11, unit: 'hour' }),
        lineItem({ item_type: 'material', description: 'Containment materials, PPE, supplies', quantity: 1, unit: 'lot' }),
      ],
      hazardTypes: ['asbestos'],
      containmentLevel: 'type_ii',
    })

    expect(result.text).not.toContain('hour')
    expect(result.text).not.toContain('lot')
    expect(result.source).toBe('job')
  })

  it('falls through to survey measurements when no line item is measured in material units', () => {
    const result = buildOppProjectDescription({
      lineItems: [lineItem({ description: 'Abatement labor', quantity: 40, unit: 'hour' })],
      survey: { material_type: 'floor tile', area_sqft: 300 },
    })

    expect(result.source).toBe('survey')
    expect(result.text).toBe('Removal and disposal of approximately 300 sq ft of floor tile.')
  })

  it('normalizes unit spellings so sqft and LF read properly', () => {
    const result = buildOppProjectDescription({
      lineItems: [
        lineItem({ description: 'Floor tile, gym', quantity: 900, unit: 'SQFT' }),
        lineItem({ description: 'Pipe lagging, boiler room', quantity: 210, unit: 'LF' }),
      ],
    })

    expect(result.text).toBe(
      'Removal and disposal of approximately 900 sq ft of Floor tile, gym; 210 linear ft of Pipe lagging, boiler room.',
    )
  })

  it('uses survey measurements when there is no estimate', () => {
    const result = buildOppProjectDescription({
      survey: {
        material_type: 'thermal system insulation',
        area_sqft: null,
        linear_ft: 100,
        volume_cuft: null,
      },
      hazardTypes: ['asbestos'],
    })

    expect(result.source).toBe('survey')
    expect(result.text).toBe(
      'Removal and disposal of approximately 100 linear ft of thermal system insulation.',
    )
  })

  it('skips zero-valued survey measurements rather than printing "0 sq ft"', () => {
    const result = buildOppProjectDescription({
      survey: { material_type: 'floor tile', area_sqft: 0, linear_ft: 40 },
    })

    expect(result.text).not.toContain('0 sq ft')
    expect(result.text).toContain('40 linear ft')
  })

  it('falls back to the hazard summary only when nothing else exists', () => {
    const result = buildOppProjectDescription({
      hazardTypes: ['asbestos'],
      containmentLevel: 'type_ii',
    })

    expect(result).toEqual({
      text: 'Hazards: asbestos. Containment level: type ii.',
      source: 'job',
    })
  })

  it('returns empty rather than a stub sentence when the job has nothing', () => {
    expect(buildOppProjectDescription({})).toEqual({ text: '', source: 'none' })
  })

  it('skips an estimate with no usable line items and moves to the survey', () => {
    const result = buildOppProjectDescription({
      lineItems: [lineItem({ item_type: 'disposal' })],
      survey: { material_type: 'floor tile', area_sqft: 300 },
    })

    expect(result.source).toBe('survey')
  })
})
