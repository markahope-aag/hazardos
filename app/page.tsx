import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login for now - later we can add a landing page
  redirect('/login')
}