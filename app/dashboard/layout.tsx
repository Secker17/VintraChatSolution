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

  if (!teamMember) {
    redirect('/auth/login')
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
