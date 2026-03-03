import { createClient } from '@/lib/supabase/server'
import { redirect, headers } from 'next/navigation'
import { InstallationGuide } from '@/components/dashboard/installation-guide'

export default async function InstallPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) {
    redirect('/auth/login')
  }

  // Resolve baseUrl on the server to avoid hydration mismatch
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  return <InstallationGuide organization={teamMember.organizations} baseUrl={baseUrl} />
}
