'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'
import { openApiSpec } from '@/lib/openapi/openapi-spec'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading API Documentation...</p>
      </div>
    </div>
  ),
})

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive API reference for the HazardOS platform
          </p>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <SwaggerUI
            spec={openApiSpec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            filter={true}
            tryItOutEnabled={false}
          />
        </div>
      </div>

      <style jsx global>{`
        /* Custom Swagger UI styling to match the app theme */
        .swagger-ui {
          font-family: inherit;
        }

        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }

        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 1px solid hsl(var(--border));
        }

        .swagger-ui .opblock {
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid hsl(var(--border));
          box-shadow: none;
        }

        .swagger-ui .opblock .opblock-summary {
          border-bottom: none;
        }

        .swagger-ui .opblock.opblock-get {
          background: rgba(97, 175, 254, 0.1);
          border-color: #61affe;
        }

        .swagger-ui .opblock.opblock-post {
          background: rgba(73, 204, 144, 0.1);
          border-color: #49cc90;
        }

        .swagger-ui .opblock.opblock-put {
          background: rgba(252, 161, 48, 0.1);
          border-color: #fca130;
        }

        .swagger-ui .opblock.opblock-patch {
          background: rgba(80, 227, 194, 0.1);
          border-color: #50e3c2;
        }

        .swagger-ui .opblock.opblock-delete {
          background: rgba(249, 62, 62, 0.1);
          border-color: #f93e3e;
        }

        .swagger-ui .btn {
          border-radius: 0.375rem;
        }

        .swagger-ui .model-box {
          background: hsl(var(--muted));
          border-radius: 0.5rem;
        }

        .swagger-ui section.models {
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
        }

        .swagger-ui .model-container {
          background: hsl(var(--card));
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .scheme-container {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .swagger-ui .filter-container {
          margin-bottom: 1rem;
        }

        .swagger-ui input[type=text] {
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 1rem;
        }

        .swagger-ui .parameter__name {
          font-weight: 600;
        }

        .swagger-ui .response-col_status {
          font-weight: 600;
        }

        .swagger-ui table tbody tr td {
          padding: 0.75rem;
        }

        .swagger-ui .markdown p {
          margin-bottom: 0.5rem;
        }

        .swagger-ui .markdown code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }

        .swagger-ui .markdown pre {
          background: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
        }
      `}</style>
    </div>
  )
}
