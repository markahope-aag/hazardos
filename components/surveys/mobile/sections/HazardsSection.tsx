'use client'

import { useSurveyStore } from '@/lib/stores/survey-store'
import { HazardTypeSelector } from '../hazards/HazardTypeSelector'
import { AsbestosForm } from '../hazards/AsbestosForm'
import { MoldForm } from '../hazards/MoldForm'
import { LeadForm } from '../hazards/LeadForm'
import { OtherHazardForm } from '../hazards/OtherHazardForm'

export function HazardsSection() {
  const { formData } = useSurveyStore()
  const { types } = formData.hazards

  const hasAsbestos = types.includes('asbestos')
  const hasMold = types.includes('mold')
  const hasLead = types.includes('lead')
  const hasOther = types.includes('other')
  const hasAnySelected = types.length > 0

  return (
    <div className="space-y-8">
      {/* Hazard Type Selection */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Hazard Types Present</h3>
        <HazardTypeSelector />
      </section>

      {/* Sub-forms for selected hazard types */}
      {hasAnySelected && (
        <div className="space-y-8 pt-4 border-t border-border">
          {hasAsbestos && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-semibold text-orange-700">Asbestos Details</h3>
              </div>
              <AsbestosForm />
            </section>
          )}

          {hasMold && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🦠</span>
                <h3 className="text-lg font-semibold text-green-700">Mold Details</h3>
              </div>
              <MoldForm />
            </section>
          )}

          {hasLead && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎨</span>
                <h3 className="text-lg font-semibold text-blue-700">Lead Paint Details</h3>
              </div>
              <LeadForm />
            </section>
          )}

          {hasOther && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚡</span>
                <h3 className="text-lg font-semibold text-purple-700">Other Hazards</h3>
              </div>
              <OtherHazardForm />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
