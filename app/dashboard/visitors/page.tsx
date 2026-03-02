import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VisitorsTable } from '@/components/dashboard/visitors-table'

export default async function VisitorsPage() {
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

  const { data: visitors } = await supabase
    .from('visitors')
    .select(`
      *,
      conversations(count)
    `)
    .eq('organization_id', organization.id)
    .order('last_seen_at', { ascending: false })

  return <VisitorsTable visitors={visitors || []} />
}
