import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'

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

  // If no team member exists, the trigger may have failed or user needs setup
  // Create a default organization for this user
  if (!teamMember) {
    // Try to create organization manually if trigger didn't work
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'My Organization',
        owner_id: user.id,
      })
      .select()
      .single()

    if (newOrg) {
      // Create team member
      await supabase
        .from('team_members')
        .insert({
          organization_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
          display_name: user.email?.split('@')[0] || 'User',
        })

      // Create default AI settings
      await supabase
        .from('ai_settings')
        .insert({
          organization_id: newOrg.id,
        })

      // Refresh the page to load the new data
      redirect('/dashboard')
    }

    // If we still can't create, show an error page instead of looping
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Setup Required</h1>
          <p className="mt-2 text-muted-foreground">
            Please verify your email to complete setup, then refresh this page.
          </p>
        </div>
      </div>
    )
  }

  const organization = teamMember.organizations

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
