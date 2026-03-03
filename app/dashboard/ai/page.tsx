import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AISettingsForm } from '@/components/dashboard/ai-settings-form'
import type { Organization } from '@/lib/types'

export default async function AIPage() {
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

  const organization = Array.isArray(teamMember.organizations)
    ? teamMember.organizations[0]
    : teamMember.organizations

  if (!organization) redirect('/auth/login')

  // Normalize plan to lowercase to avoid case mismatch with PLAN_LIMITS
  organization.plan = (organization.plan || 'free').toLowerCase() as Organization['plan']

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
