import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AISettingsForm } from '@/components/dashboard/ai-settings-form'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function AIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const result = await getTeamMemberWithOrg(supabase, user.id)
  if (!result || !result.organization) redirect('/auth/login')

  const { organization } = result

  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('organization_id', organization.id)
    .single()

  return (
    <AISettingsForm 
      organization={organization}
      aiSettings={aiSettings}
    />
  )
}
