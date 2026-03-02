'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { Organization, TeamMember } from '@/lib/types'

interface SettingsFormProps {
  organization: Organization
  teamMember: TeamMember
}

export function SettingsForm({ organization, teamMember }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [orgName, setOrgName] = useState(organization.name)
  const [displayName, setDisplayName] = useState(teamMember.display_name || '')
  
  // Widget settings
  const [primaryColor, setPrimaryColor] = useState(organization.settings.primaryColor)
  const [position, setPosition] = useState(organization.settings.position)
  const [welcomeMessage, setWelcomeMessage] = useState(organization.settings.welcomeMessage)
  const [offlineMessage, setOfflineMessage] = useState(organization.settings.offlineMessage)
  const [showBranding, setShowBranding] = useState(organization.settings.showBranding)
  
  const { toast } = useToast()
  const supabase = createClient()

  const handleSaveOrganization = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          settings: {
            primaryColor,
            position,
            welcomeMessage,
            offlineMessage,
            avatar: organization.settings.avatar,
            showBranding,
          },
        })
        .eq('id', organization.id)

      if (error) throw error

      toast({
        title: 'Settings saved',
        description: 'Your organization settings have been updated.',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ display_name: displayName })
        .eq('id', teamMember.id)

      if (error) throw error

      toast({
        title: 'Profile saved',
        description: 'Your profile has been updated.',
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization and widget settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>General organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Widget Customization</CardTitle>
          <CardDescription>Customize how your chat widget looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#0066FF"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="position">Widget Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! How can we help you today?"
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="offlineMessage">Offline Message</Label>
            <Textarea
              id="offlineMessage"
              value={offlineMessage}
              onChange={(e) => setOfflineMessage(e.target.value)}
              placeholder="We're currently offline. Leave us a message!"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show ChatFlow Branding</Label>
              <p className="text-sm text-muted-foreground">
                Display "Powered by ChatFlow" in the widget
              </p>
            </div>
            <Switch
              checked={showBranding}
              onCheckedChange={setShowBranding}
              disabled={organization.plan === 'free'}
            />
          </div>

          {organization.plan === 'free' && (
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro to remove branding from your widget.
            </p>
          )}

          <Button onClick={handleSaveOrganization} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Widget Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
