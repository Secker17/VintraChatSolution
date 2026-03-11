import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { resolveOrganization } from '@/lib/get-organization'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get organization and team member data
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .single()

  // If no team member exists, the trigger may have failed or user registered before triggers were set up
  // Use admin client to bypass RLS and create organization + team member
  if (!teamMember) {
    const admin = createAdminClient()

    // Check if org already exists for this user (owner)
    const { data: existingOrg } = await admin
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    let orgId = existingOrg?.id

    if (!orgId) {
      const { data: newOrg } = await admin
        .from('organizations')
        .insert({
          name: `${user.email?.split('@')[0] || 'My'}'s Organization`,
          owner_id: user.id,
        })
        .select('id')
        .single()
      orgId = newOrg?.id
    }

    if (orgId) {
      await admin
        .from('team_members')
        .upsert({
          organization_id: orgId,
          user_id: user.id,
          role: 'owner',
          display_name: user.email?.split('@')[0] || 'User',
        }, { onConflict: 'organization_id,user_id' })

      await admin
        .from('ai_settings')
        .upsert({ organization_id: orgId }, { onConflict: 'organization_id' })

      redirect('/dashboard')
    }

    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Setup Failed</h1>
          <p className="mt-2 text-muted-foreground">
            Could not create your organization. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  const organization = resolveOrganization(teamMember.organizations)

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar 
        organization={organization} 
        teamMember={teamMember}
        user={user}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader 
          organization={organization}
          teamMember={teamMember}
          user={user}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
