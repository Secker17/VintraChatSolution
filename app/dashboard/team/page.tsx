import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamManagement } from '@/components/dashboard/team-management'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { teamMember, organization } = result

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
