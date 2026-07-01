import { describe, it, expect } from 'vitest'
import {
  deriveCredentialStatus,
  resolveRequiredTypes,
  evaluateWorker,
  type CredentialType,
  type CredentialWithStatus,
} from '@/lib/services/credentials'

const NOW = new Date('2026-07-01T12:00:00Z')

function makeType(overrides: Partial<CredentialType> = {}): CredentialType {
  return {
    id: overrides.id ?? 'type-1',
    organization_id: 'org-1',
    name: overrides.name ?? 'Asbestos Worker License',
    category: overrides.category ?? 'worker_license',
    applies_to: overrides.applies_to ?? 'worker',
    issuing_authority: null,
    default_valid_days: null,
    warning_lead_days: overrides.warning_lead_days ?? 30,
    required_for_containment_levels: overrides.required_for_containment_levels ?? null,
    required_for_hazard_types: overrides.required_for_hazard_types ?? null,
    is_active: overrides.is_active ?? true,
    created_at: '',
    updated_at: '',
  }
}

function makeCred(typeId: string, status: CredentialWithStatus['status'], expiry: string | null): CredentialWithStatus {
  return {
    id: `cred-${typeId}-${expiry ?? 'none'}`,
    organization_id: 'org-1',
    credential_type_id: typeId,
    worker_id: 'worker-1',
    asset_id: null,
    identifier: null,
    issued_date: null,
    expiry_date: expiry,
    document_path: null,
    notes: null,
    created_at: '',
    updated_at: '',
    status,
    credential_type_name: 'x',
    category: 'worker_license',
    warning_lead_days: 30,
    worker_name: 'Test Worker',
  }
}

describe('deriveCredentialStatus', () => {
  it('is no_expiry when there is no expiry date', () => {
    expect(deriveCredentialStatus(null, 30, NOW)).toBe('no_expiry')
  })

  it('is expired when the expiry date is in the past', () => {
    expect(deriveCredentialStatus('2026-06-30', 30, NOW)).toBe('expired')
  })

  it('is expiring_soon inside the lead window', () => {
    expect(deriveCredentialStatus('2026-07-20', 30, NOW)).toBe('expiring_soon')
  })

  it('is valid beyond the lead window', () => {
    expect(deriveCredentialStatus('2026-09-01', 30, NOW)).toBe('valid')
  })

  it('treats today as expiring_soon, not expired (boundary)', () => {
    expect(deriveCredentialStatus('2026-07-01', 30, NOW)).toBe('expiring_soon')
  })

  it('honors a custom per-type lead window', () => {
    expect(deriveCredentialStatus('2026-08-15', 60, NOW)).toBe('expiring_soon')
    expect(deriveCredentialStatus('2026-08-15', 14, NOW)).toBe('valid')
  })
})

describe('resolveRequiredTypes', () => {
  const asbestosWorker = makeType({ id: 'aw', required_for_hazard_types: ['asbestos'] })
  const supervisorTypeIII = makeType({ id: 'sup', required_for_containment_levels: ['type_ii', 'type_iii'] })
  const leadRRP = makeType({ id: 'lead', required_for_hazard_types: ['lead'] })
  const inactive = makeType({ id: 'off', required_for_hazard_types: ['asbestos'], is_active: false })
  const types = [asbestosWorker, supervisorTypeIII, leadRRP, inactive]

  it('requires types matching the job hazard types', () => {
    const req = resolveRequiredTypes({ containment_level: null, hazard_types: ['asbestos'] }, types)
    expect(req.map((t) => t.id).sort()).toEqual(['aw'])
  })

  it('requires types matching the job containment level', () => {
    const req = resolveRequiredTypes({ containment_level: 'type_iii', hazard_types: ['asbestos'] }, types)
    expect(req.map((t) => t.id).sort()).toEqual(['aw', 'sup'])
  })

  it('ignores inactive types and non-matching hazards', () => {
    const req = resolveRequiredTypes({ containment_level: 'type_i', hazard_types: ['mold'] }, types)
    expect(req).toHaveLength(0)
  })
})

describe('evaluateWorker', () => {
  const t = makeType({ id: 'aw', required_for_hazard_types: ['asbestos'] })

  it('is blocked when a required credential is missing', () => {
    const res = evaluateWorker('w1', 'Alice', [t], [])
    expect(res.readiness).toBe('blocked')
    expect(res.requirements[0].state).toBe('missing')
  })

  it('is blocked when a required credential is expired', () => {
    const res = evaluateWorker('w1', 'Alice', [t], [makeCred('aw', 'expired', '2026-06-01')])
    expect(res.readiness).toBe('blocked')
    expect(res.requirements[0].state).toBe('expired')
  })

  it('is warning when a required credential is expiring soon', () => {
    const res = evaluateWorker('w1', 'Alice', [t], [makeCred('aw', 'expiring_soon', '2026-07-15')])
    expect(res.readiness).toBe('warning')
    expect(res.requirements[0].state).toBe('expiring_soon')
  })

  it('is ready when all required credentials are valid', () => {
    const res = evaluateWorker('w1', 'Alice', [t], [makeCred('aw', 'valid', '2027-01-01')])
    expect(res.readiness).toBe('ready')
    expect(res.requirements[0].state).toBe('valid')
  })

  it('picks the credential with the furthest expiry when several are held', () => {
    const res = evaluateWorker('w1', 'Alice', [t], [
      makeCred('aw', 'expired', '2026-06-01'),
      makeCred('aw', 'valid', '2027-06-01'),
    ])
    expect(res.readiness).toBe('ready')
    expect(res.requirements[0].expiry_date).toBe('2027-06-01')
  })

  it('reports ready with no requirements', () => {
    expect(evaluateWorker('w1', 'Alice', [], []).readiness).toBe('ready')
  })
})
