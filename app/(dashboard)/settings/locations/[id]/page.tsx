import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LocationService } from '@/lib/services/location-service'
import { LocationForm } from '@/components/settings/location-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface EditLocationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id)
    .single()

  if (!profile?.organization_id) {
    return <div>No organization found</div>
  }

  const location = await LocationService.get(id)
  if (!location || location.organization_id !== profile.organization_id) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/locations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to locations
        </Link>
        <h1 className="text-2xl font-bold">{location.name}</h1>
        <p className="text-muted-foreground">Edit this location&apos;s details.</p>
      </div>

      <LocationForm location={location} />
    </div>
  )
}
