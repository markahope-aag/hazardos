import type { Metadata } from 'next'
import { APIDocsClient } from './api-docs-client'

export const metadata: Metadata = {
  title: 'API Documentation - HazardOS',
  description: 'Interactive API documentation for the HazardOS platform',
}

export default function APIDocsPage() {
  return <APIDocsClient />
}
