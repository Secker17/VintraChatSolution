'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2, Crown, Shield, User } from 'lucide-react'
import type { Organization, TeamMember } from '@/lib/types'
import { PLAN_LIMITS } from '@/lib/types'

interface TeamManagementProps {
  organization: Organization
  currentMember: TeamMember
  teamMembers: TeamMember[]
}

export function TeamManagement({ organization, currentMember, teamMembers: initialMembers }: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState(initialMembers)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch with Radix UI components
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { toast } = useToast()
  const supabase = createClient()

  const planLimits = PLAN_LIMITS[organization.plan]
  const canAddMembers = planLimits.teamMembers === -1 || teamMembers.length < planLimits.teamMembers
  const isOwner = currentMember.role === 'owner'

  // Show loading skeleton until client-side hydration is complete
  if (!isMounted) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-4">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleStatusChange = async (memberId: string, status: 'online' | 'offline' | 'away') => {
    try {
      await supabase
        .from('team_members')
        .update({ status })
        .eq('id', memberId)

      setTeamMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, status } : m)
      )
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return

    setIsLoading(true)
    try {
      // In a real app, you would send an invitation email here
      // For now, we'll show a message
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${inviteEmail}`,
      })
      setInviteEmail('')
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error inviting member:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setTeamMembers(prev => prev.filter(m => m.id !== memberId))
      toast({
        title: 'Member removed',
        description: 'The team member has been removed.',
      })
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove member. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-amber-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500'
      case 'away':
        return 'bg-amber-500'
      default:
        return 'bg-muted-foreground'
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their access
          </p>
        </div>
        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canAddMembers}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'agent')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleInviteMember} 
                  className="w-full"
                  disabled={isLoading || !inviteEmail.trim()}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canAddMembers && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You've reached the team member limit for your plan ({planLimits.teamMembers} members).
              Upgrade to add more team members.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Status</CardTitle>
          <CardDescription>
            Set your availability status for visitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={currentMember.status} 
            onValueChange={(v) => handleStatusChange(currentMember.id, v as 'online' | 'offline' | 'away')}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </span>
              </SelectItem>
              <SelectItem value="away">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Away
                </span>
              </SelectItem>
              <SelectItem value="offline">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Offline
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({teamMembers.length})</CardTitle>
          <CardDescription>
            {planLimits.teamMembers === -1 
              ? 'Unlimited team members on your plan'
              : `${teamMembers.length} / ${planLimits.teamMembers} members`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>
                        {(member.display_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.display_name || 'Unnamed'}</p>
                      {getRoleIcon(member.role)}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {member.status}
                  </Badge>
                  {isOwner && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
