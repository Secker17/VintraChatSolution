import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingView } from '@/components/dashboard/billing-view'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  
  if (!result || !result.organization) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we load your data.</p>
        </div>
      </div>
    )
  }

  return <BillingView organization={result.organization} />
}
