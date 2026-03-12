import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VisitorsTable } from '@/components/dashboard/visitors-table'
import { resolveOrganization } from '@/lib/get-organization'

export default async function VisitorsPage() {
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
          <h2 className="text-xl font-semibold mb-2">No visitors yet</h2>
          <p className="text-muted-foreground">Visitors will appear here when they use your chat widget.</p>
        </div>
      </div>
    )
  }

  const { data: visitors } = await admin
    .from('visitors')
    .select(`
      *,
      conversations(count)
    `)
    .eq('organization_id', organization.id)
    .order('last_seen_at', { ascending: false })

  return <VisitorsTable visitors={visitors || []} />
}
