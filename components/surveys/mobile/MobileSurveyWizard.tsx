'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MobileSurveyWizardProps {
  customerId?: string
  onComplete?: (data: {
    id: string
    customer_id: string
    survey_data: Record<string, unknown>
  }) => void
}

export default function MobileSurveyWizard({ customerId: _customerId, onComplete: _onComplete }: MobileSurveyWizardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Survey Wizard</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Mobile survey wizard coming soon...
        </p>
      </CardContent>
    </Card>
  )
}