import { requirePlatformUser } from '@/lib/auth/require-platform-user'
import DatabaseStatusClient from './database-status-client'

export default async function DatabaseStatusPage() {
  await requirePlatformUser()
  return <DatabaseStatusClient />
}
