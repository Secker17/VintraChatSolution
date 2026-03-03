import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsView } from '@/components/dashboard/analytics-view'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { organization } = result

  // Get conversation stats
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)

  const { count: openConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('status', 'open')

  const { count: resolvedConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('status', 'resolved')

  // Get total messages
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*, conversations!inner(*)', { count: 'exact', head: true })
    .eq('conversations.organization_id', organization.id)

  // Get total visitors
  const { count: totalVisitors } = await supabase
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
        aiResponses: organization.ai_responses_used,
        conversationsThisMonth: organization.conversations_this_month,
      }}
      organization={organization}
    />
  )
}
