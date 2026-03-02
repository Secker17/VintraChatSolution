import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamManagement } from '@/components/dashboard/team-management'

export default async function TeamPage() {
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

  const organization = teamMember.organizations

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: true })

  return (
    <TeamManagement 
      organization={organization}
      currentMember={teamMember}
      teamMembers={teamMembers || []}
    />
  )
}
