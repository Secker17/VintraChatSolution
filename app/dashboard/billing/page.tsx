import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingView } from '@/components/dashboard/billing-view'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  return <BillingView organization={result.organization} />
}
