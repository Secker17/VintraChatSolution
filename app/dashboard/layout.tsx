import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { resolveOrganization } from '@/lib/get-organization'
import type { Organization, TeamMember } from '@/lib/types'

// Helper to check if error is a Next.js redirect
function isRedirectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'digest' in error &&
    typeof (error as { digest?: string }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

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
  const { data: teamMember, error: tmError } = await supabase
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .single()

  // If tables don't exist yet, redirect to setup
  if (tmError?.code === 'PGRST116' || tmError?.message?.includes('42P01') || tmError?.code === '42P01') {
    redirect('/setup')
  }

  // If no team member exists, create organization and team member using admin client
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
      // Create team member
      const { data: newTeamMember } = await admin
        .from('team_members')
        .upsert({
          organization_id: orgId,
          user_id: user.id,
          role: 'owner',
          display_name: user.email?.split('@')[0] || 'User',
        }, { onConflict: 'organization_id,user_id' })
        .select('*, organizations(*)')
        .single()

      // Create ai_settings
      await admin
        .from('ai_settings')
        .upsert({ organization_id: orgId }, { onConflict: 'organization_id' })

      // If we successfully created team member, use it directly instead of redirecting
      if (newTeamMember) {
        const organization = resolveOrganization(newTeamMember.organizations)
        if (organization) {
          return (
            <div className="flex h-screen bg-background">
              <DashboardSidebar 
                organization={organization} 
                teamMember={newTeamMember as TeamMember}
                user={user}
              />
              <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                <DashboardHeader 
                  organization={organization}
                  teamMember={newTeamMember as TeamMember}
                  user={user}
                />
                <div className="flex-1 min-h-0 overflow-hidden">
                  {children}
                </div>
              </div>
            </div>
          )
        }
      }
    }

    // Only show error if we couldn't create org
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

  if (!organization) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No Organization</h1>
          <p className="mt-2 text-muted-foreground">
            Could not find your organization. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar 
        organization={organization} 
        teamMember={teamMember}
        user={user}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <DashboardHeader 
          organization={organization}
          teamMember={teamMember}
          user={user}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
