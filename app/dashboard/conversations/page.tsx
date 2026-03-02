import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConversationsTable } from '@/components/dashboard/conversations-table'

export default async function ConversationsPage() {
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
