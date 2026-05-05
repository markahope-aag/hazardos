import { requirePlatformUser } from '@/lib/auth/require-platform-user'
import MigrationVerificationClient from './migration-verification-client'

export default async function MigrationVerificationPage() {
  await requirePlatformUser()
  return <MigrationVerificationClient />
}
