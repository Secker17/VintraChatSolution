import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VisitorsTable } from '@/components/dashboard/visitors-table'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function VisitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { organization } = result

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
