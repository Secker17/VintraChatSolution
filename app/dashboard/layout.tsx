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

  try {
    // Get organization and team member data
    const { data: teamMember, error: tmError } = await supabase
      .from('team_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .single()

    // If tables don't exist yet, redirect to setup
    if (tmError?.code === 'PGRST116' || tmError?.message?.includes('42P01') || tmError?.code === '404') {
      console.log('[v0] Database tables not initialized, redirecting to setup')
      redirect('/setup')
    }

    // If no team member exists, the trigger may have failed or user registered before triggers were set up
    // Use admin client to bypass RLS and create organization + team member
    if (!teamMember) {
      console.log('[v0] Creating new organization for user:', user.id)
      const admin = createAdminClient()

      // Check if org already exists for this user (owner)
      const { data: existingOrg } = await admin
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      let orgId = existingOrg?.id

      if (!orgId) {
        const { data: newOrg, error: orgError } = await admin
          .from('organizations')
          .insert({
            name: `${user.email?.split('@')[0] || 'My'}'s Organization`,
            owner_id: user.id,
          })
          .select('id')
          .single()
        orgId = newOrg?.id
        if (orgError) console.log('[v0] Org creation error:', orgError)
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
  } catch (error) {
    console.log('[v0] Dashboard layout error:', error)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="mt-2 text-muted-foreground">
            {error instanceof Error ? error.message : 'An error occurred. Please try again.'}
          </p>
        </div>
      </div>
    )
  }
}
