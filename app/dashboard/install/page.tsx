import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getTeamMemberWithOrg } from '@/lib/get-organization'
import { InstallationGuideClient } from '@/components/dashboard/installation-guide-client'

export default async function InstallPage() {
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

  const { organization } = result

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  return <InstallationGuideClient organization={organization} baseUrl={baseUrl} />
}
