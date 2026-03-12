import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { resolveOrganization } from '@/lib/get-organization'
import { DashboardInbox } from '@/components/dashboard/dashboard-inbox'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Get team member with organization - use admin client to bypass RLS issues
  const admin = createAdminClient()
  const { data: teamMember } = await admin
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) {
    // Layout should have created org, but if not show empty state
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Welcome to VintraChat</h2>
          <p className="text-muted-foreground">
            Your inbox is empty. When visitors start conversations, they will appear here.
          </p>
        </div>
      </div>
    )
  }

  const organization = resolveOrganization(teamMember.organizations)
  
  if (!organization) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Organization not found</h2>
          <p className="text-muted-foreground">Please contact support.</p>
        </div>
      </div>
    )
  }

  // Get conversations with visitors and messages
  const { data: conversations } = await admin
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
  const { data: teamMembers } = await admin
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
