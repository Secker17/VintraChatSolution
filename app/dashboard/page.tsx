import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTeamMemberWithOrg } from '@/lib/get-organization'
import { DashboardInbox } from '@/components/dashboard/dashboard-inbox'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  
  // Handle missing organization gracefully instead of redirecting
  if (!result || !result.organization) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Setting up your workspace</h2>
          <p className="text-muted-foreground mb-4">
            Your organization is being created. Please refresh the page in a moment.
          </p>
          <a 
            href="/dashboard" 
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Refresh
          </a>
        </div>
      </div>
    )
  }

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
    <DashboardInbox 
      initialConversations={conversations || []}
      organization={organization}
      teamMember={teamMember}
      teamMembers={teamMembers || []}
    />
  )
}
