'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { FileText, Save, Loader2 } from 'lucide-react'
import type { SiteSurvey } from '@/types/database'

interface NotesSectionProps {
  survey: SiteSurvey
}

export function NotesSection({ survey }: NotesSectionProps) {
  const { toast } = useToast()
  const [technicianNotes, _setTechnicianNotes] = useState(survey.technician_notes || '')
  const [officeNotes, setOfficeNotes] = useState(survey.notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNotes = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('site_surveys')
        .update({
          notes: officeNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (error) throw error

      toast({
        title: 'Notes saved',
        description: 'Office notes have been updated.',
      })
    } catch (error) {
      console.error('Error saving notes:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notes. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Technician Notes (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Technician Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {technicianNotes ? (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground">{technicianNotes}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No technician notes recorded for this survey.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Office Notes (Editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Office Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={officeNotes}
            onChange={(e) => setOfficeNotes(e.target.value)}
            placeholder="Add office notes, review comments, or follow-up items..."
            rows={6}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSaveNotes}
              disabled={isSaving || officeNotes === (survey.notes || '')}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Special Conditions */}
      {survey.special_conditions && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Special Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{survey.special_conditions}</p>
          </CardContent>
        </Card>
      )}

      {/* Survey Metadata */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Survey Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">Created</label>
              <p className="font-medium">{new Date(survey.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-muted-foreground">Last Updated</label>
              <p className="font-medium">{new Date(survey.updated_at).toLocaleString()}</p>
            </div>
            {survey.started_at && (
              <div>
                <label className="text-muted-foreground">Started</label>
                <p className="font-medium">{new Date(survey.started_at).toLocaleString()}</p>
              </div>
            )}
            {survey.submitted_at && (
              <div>
                <label className="text-muted-foreground">Submitted</label>
                <p className="font-medium">{new Date(survey.submitted_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
