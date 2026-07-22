'use client'

import { OpenApiViewer } from '@/components/api-docs/openapi-viewer'
import { openApiSpec } from '@/lib/openapi/openapi-spec'

export function APIDocsClient() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap gap-4">
          <a
            href="/api/openapi"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenAPI Spec (JSON)
          </a>
          <a
            href="https://github.com/markahope-aag/hazardos"
            className="inline-flex items-center rounded-lg border px-4 py-2 transition-colors hover:bg-muted"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repository
          </a>
        </div>

        {/*
          Renders the same imported spec object the /api/openapi route serves,
          rather than fetching that endpoint. The old SwaggerUI passed
          url="/api/openapi", which meant this public page made a rate-limited
          request to our own API on every visit just to draw itself.
        */}
        <OpenApiViewer spec={openApiSpec} />
      </div>
    </div>
  )
}
