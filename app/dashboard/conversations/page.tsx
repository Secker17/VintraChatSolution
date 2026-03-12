import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConversationsTable } from '@/components/dashboard/conversations-table'
import { resolveOrganization } from '@/lib/get-organization'

export default async function ConversationsPage() {
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

  if (!organization) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
          <p className="text-muted-foreground">Conversations will appear here when visitors start chatting.</p>
        </div>
      </div>
    )
  }

  const { data: conversations } = await admin
    .from('conversations')
    .select(`
      *,
      visitor:visitors(*),
      messages(count)
    `)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })

  return <ConversationsTable conversations={conversations || []} />
}
