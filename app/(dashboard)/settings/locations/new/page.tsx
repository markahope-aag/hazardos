import { LocationForm } from '@/components/settings/location-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewLocationPage() {
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
        <h1 className="text-2xl font-bold">Add location</h1>
        <p className="text-muted-foreground">
          Create a new office or service area for your organization.
        </p>
      </div>

      <LocationForm />
    </div>
  )
}
