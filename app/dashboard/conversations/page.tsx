import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConversationsTable } from '@/components/dashboard/conversations-table'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { organization } = result

  const { data: conversations } = await supabase
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
