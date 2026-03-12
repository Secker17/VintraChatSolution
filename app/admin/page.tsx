'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Search, Crown, Shield, Building2, RefreshCw } from 'lucide-react'

interface Organization {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  owner_id: string
  created_at: string
  conversations_this_month: number
  ai_responses_used: number
}

const ADMIN_EMAILS = ['admin@vintrastudio.com', 'secker@vintrastudio.com']

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        setIsAuthorized(false)
        setIsLoading(false)
        return
      }

      setIsAuthorized(true)
      await fetchOrganizations()
    } catch (err) {
      setError('Failed to check authorization')
      setIsLoading(false)
    }
  }

  async function fetchOrganizations() {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/organizations')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch organizations')
      }

      setOrganizations(data.organizations || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch organizations'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function updatePlan(orgId: string, newPlan: 'free' | 'pro' | 'enterprise') {
    setUpdatingId(orgId)
    
    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, updates: { plan: newPlan } }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update plan')
      }

      toast({
        title: 'Plan updated',
        description: `Organization has been upgraded to ${newPlan}`,
      })
      
      setOrganizations(orgs => 
        orgs.map(org => org.id === orgId ? { ...org, plan: newPlan } : org)
      )
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update plan',
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  async function resetUsage(orgId: string) {
    setUpdatingId(orgId)
    
    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          updates: {
            conversations_this_month: 0,
            ai_responses_used: 0,
            billing_cycle_start: new Date().toISOString(),
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset usage')
      }

      toast({
        title: 'Usage reset',
        description: 'Monthly usage has been reset',
      })
      
      setOrganizations(orgs => 
        orgs.map(org => org.id === orgId ? { ...org, conversations_this_month: 0, ai_responses_used: 0 } : org)
      )
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to reset usage',
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading && isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error && organizations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchOrganizations} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations and subscription plans
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                {organizations.length} total organizations
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchOrganizations}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="space-y-4">
              {filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{org.name}</span>
                      <Badge variant={
                        org.plan === 'enterprise' ? 'default' :
                        org.plan === 'pro' ? 'secondary' : 'outline'
                      }>
                        {org.plan === 'enterprise' && <Crown className="mr-1 h-3 w-3" />}
                        {org.plan === 'pro' && <Shield className="mr-1 h-3 w-3" />}
                        {org.plan === 'free' && <Building2 className="mr-1 h-3 w-3" />}
                        {org.plan}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ID: {org.id.substring(0, 8)}...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Conversations: {org.conversations_this_month} | AI Responses: {org.ai_responses_used}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Plan:</Label>
                      <Select
                        value={org.plan}
                        onValueChange={(value) => updatePlan(org.id, value as 'free' | 'pro' | 'enterprise')}
                        disabled={updatingId === org.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetUsage(org.id)}
                      disabled={updatingId === org.id}
                    >
                      {updatingId === org.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Reset Usage'
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {filteredOrgs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No organizations found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
