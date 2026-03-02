import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  return <InstallationGuide organization={teamMember.organizations} />
}
