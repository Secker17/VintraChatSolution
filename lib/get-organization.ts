import type { SupabaseClient } from '@supabase/supabase-js'
import type { Organization } from '@/lib/types'

/**
 * Resolves organization from a team_member's organizations join result.
 * Supabase may return a single object or an array depending on the query.
 * Also normalizes plan to lowercase so PLAN_LIMITS never crashes.
 */
export function resolveOrganization(
  organizations: Organization | Organization[] | null | undefined
): Organization | null {
  if (!organizations) return null
  const org = Array.isArray(organizations) ? organizations[0] : organizations
  if (!org) return null
  org.plan = ((org.plan || 'free') as string).toLowerCase() as Organization['plan']
  return org
}

/**
 * Fetches the current user's team member + organization in one query.
 * Returns null if the user has no team member record.
 */
export async function getTeamMemberWithOrg(supabase: SupabaseClient, userId: string) {
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', userId)
    .single()

  if (!teamMember) return null

  const organization = resolveOrganization(teamMember.organizations)
  return { teamMember, organization }
}
