import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InboxView } from '@/components/dashboard/inbox-view'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { teamMember, organization } = result

  // Get conversations with visitors and messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      visitor:visitors(*),
      messages(*)
    `)
    .eq('organization_id', organization.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)

  // Get team members for assignment
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', organization.id)

  return (
    <InboxView 
      initialConversations={conversations || []}
      organization={organization}
      teamMember={teamMember}
      teamMembers={teamMembers || []}
    />
  )
}
