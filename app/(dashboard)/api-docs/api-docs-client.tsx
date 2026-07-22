'use client'

import { OpenApiViewer } from '@/components/api-docs/openapi-viewer'
import { openApiSpec } from '@/lib/openapi/openapi-spec'

export default function ApiDocsClient() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <OpenApiViewer spec={openApiSpec} />
      </div>
    </div>
  )
}
