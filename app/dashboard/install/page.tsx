import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

const InstallationGuide = dynamic(
  () => import('@/components/dashboard/installation-guide').then(m => ({ default: m.InstallationGuide })),
  { ssr: false }
)

export default async function InstallPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { organization } = result

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  return <InstallationGuide organization={organization} baseUrl={baseUrl} />
}
