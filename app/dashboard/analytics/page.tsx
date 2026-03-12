import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsView } from '@/components/dashboard/analytics-view'
import { resolveOrganization } from '@/lib/get-organization'

export default async function AnalyticsPage() {
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
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p className="text-muted-foreground">Analytics will be available once you have conversations.</p>
        </div>
      </div>
    )
  }

  // Get conversation stats
  const { count: totalConversations } = await admin
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)

  const { count: openConversations } = await admin
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('status', 'open')

  const { count: resolvedConversations } = await admin
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('status', 'resolved')

  // Get total messages
  const { count: totalMessages } = await admin
    .from('messages')
    .select('*, conversations!inner(*)', { count: 'exact', head: true })
    .eq('conversations.organization_id', organization.id)

  // Get total visitors
  const { count: totalVisitors } = await admin
    .from('visitors')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)

  return (
    <AnalyticsView 
      stats={{
        totalConversations: totalConversations || 0,
        openConversations: openConversations || 0,
        resolvedConversations: resolvedConversations || 0,
        totalMessages: totalMessages || 0,
        totalVisitors: totalVisitors || 0,
        aiResponses: organization.ai_responses_used || 0,
        conversationsThisMonth: organization.conversations_this_month || 0,
      }}
      organization={organization}
    />
  )
}
