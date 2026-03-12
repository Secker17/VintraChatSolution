import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamManagement } from '@/components/dashboard/team-management'
import { resolveOrganization } from '@/lib/get-organization'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: teamMember } = await admin
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .single()

  const organization = teamMember ? resolveOrganization(teamMember.organizations) : null

  if (!organization || !teamMember) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Team</h2>
          <p className="text-muted-foreground">Manage your team members here.</p>
        </div>
      </div>
    )
  }

  const { data: teamMembers } = await admin
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
