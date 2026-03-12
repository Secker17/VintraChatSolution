import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AISettingsForm } from '@/components/dashboard/ai-settings-form'
import { resolveOrganization } from '@/lib/get-organization'

export default async function AIPage() {
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
          <h2 className="text-xl font-semibold mb-2">AI Assistant</h2>
          <p className="text-muted-foreground">Configure your AI settings here.</p>
        </div>
      </div>
    )
  }

  const { data: aiSettings } = await admin
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
