import { requirePlatformUser } from '@/lib/auth/require-platform-user'
import ApiDocsClient from './api-docs-client'

export default async function ApiDocsPage() {
  await requirePlatformUser()
  return <ApiDocsClient />
}
