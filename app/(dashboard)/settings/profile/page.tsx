import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'

/**
 * /settings/profile — self-serve profile editing. The team management endpoint
 * blocks a user from editing themselves and points here (ST21: this page did
 * not exist, so self-edits had nowhere to go).
 */
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground">Update your name and see your account email.</p>
      </div>
      <ProfileForm
        initialFirstName={profile?.first_name ?? ''}
        initialLastName={profile?.last_name ?? ''}
        email={profile?.email ?? user.email ?? ''}
      />
    </div>
  )
}
