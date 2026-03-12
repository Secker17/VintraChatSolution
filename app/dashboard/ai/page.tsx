import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AISettingsForm } from '@/components/dashboard/ai-settings-form'
import { getTeamMemberWithOrg } from '@/lib/get-organization'

export default async function AIPage() {
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
