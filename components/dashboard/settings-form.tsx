'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageCircle, MessageSquare, HeadphonesIcon, HandIcon } from 'lucide-react'
import GlassOrbAvatar from '@/components/ui/glass-orb-avatar'
import type { Organization, TeamMember, WidgetSettings } from '@/lib/types'

interface SettingsFormProps {
  organization: Organization
  teamMember: TeamMember
}

const BUBBLE_ICONS = [
  { id: 'chat', name: 'Chat', icon: MessageCircle },
  { id: 'message', name: 'Message', icon: MessageSquare },
  { id: 'support', name: 'Support', icon: HeadphonesIcon },
  { id: 'wave', name: 'Wave', icon: HandIcon },
  { id: 'glassOrb', name: 'Glass Orb', icon: null as any, custom: true },
] as const

export function SettingsForm({ organization, teamMember }: SettingsFormProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [orgName, setOrgName] = useState(organization.name)
  const [displayName, setDisplayName] = useState(teamMember.display_name || '')
  
  // Widget settings
  const [primaryColor, setPrimaryColor] = useState(organization.settings.primaryColor)
  const [position, setPosition] = useState(organization.settings.position)
  const [welcomeMessage, setWelcomeMessage] = useState(organization.settings.welcomeMessage)
  const [offlineMessage, setOfflineMessage] = useState(organization.settings.offlineMessage)
  const [showBranding, setShowBranding] = useState(organization.settings.showBranding)
  const [bubbleIcon, setBubbleIcon] = useState<WidgetSettings['bubbleIcon']>(organization.settings.bubbleIcon || 'chat')
  const [bubbleSize, setBubbleSize] = useState<WidgetSettings['bubbleSize']>(organization.settings.bubbleSize || 'medium')
  const [bubbleStyle, setBubbleStyle] = useState<WidgetSettings['bubbleStyle']>(organization.settings.bubbleStyle || 'solid')
  const [bubbleShadow, setBubbleShadow] = useState<boolean>(organization.settings.bubbleShadow ?? true)
  const [bubbleAnimation, setBubbleAnimation] = useState<WidgetSettings['bubbleAnimation']>(organization.settings.bubbleAnimation || 'none')
  const [glassOrbGlyph, setGlassOrbGlyph] = useState(organization.settings.glassOrbGlyph || 'V')
  
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
            bubbleIcon,
            bubbleSize,
            bubbleStyle,
            bubbleShadow,
            bubbleAnimation,
            glassOrbGlyph,
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
              <Label>Show VintraChat Branding</Label>
              <p className="text-sm text-muted-foreground">
                Display "Powered by VintraChat" in the widget
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

      <Card>
        <CardHeader>
          <CardTitle>Chat Bubble Design</CardTitle>
          <CardDescription>Customize how the chat button looks on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label>Bubble Icon</Label>
              {bubbleIcon === 'glassOrb' && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">Experimental</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-3">
              {BUBBLE_ICONS.map((icon) => {
                const isSelected = bubbleIcon === icon.id
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setBubbleIcon(icon.id as WidgetSettings['bubbleIcon'])}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all relative ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    {icon.custom && (
                      <span className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Beta</span>
                    )}
                    {icon.custom ? (
                      <GlassOrbAvatar
                        glyph={glassOrbGlyph}
                        size={48}
                        style={{ position: 'relative', width: '48px', height: '48px' }}
                        className="rounded-full"
                      />
                    ) : (
                      <div 
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {icon.icon && <icon.icon className="h-6 w-6" />}
                      </div>
                    )}
                    <span className="text-sm font-medium">{icon.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Glass Orb Glyph Input */}
            {bubbleIcon === 'glassOrb' && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="glyphInput">Glass Orb Symbol</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="glyphInput"
                    type="text"
                    value={glassOrbGlyph}
                    onChange={(e) => setGlassOrbGlyph(e.target.value.toUpperCase().slice(0, 1) || 'V')}
                    maxLength={1}
                    placeholder="Enter 1 character"
                    className="flex-1 text-center text-lg font-bold"
                  />
                  <div className="flex items-center justify-center h-12 w-12 rounded-full" style={{ backgroundColor: primaryColor }}>
                    <GlassOrbAvatar
                      glyph={glassOrbGlyph}
                      size={48}
                      style={{ position: 'relative', width: '48px', height: '48px' }}
                      className="rounded-full"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Choose a single character to display in the Glass Orb (e.g., V, A, C, ?, !)</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Bubble Size</Label>
              <Select value={bubbleSize} onValueChange={(v) => setBubbleSize(v as WidgetSettings['bubbleSize'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (48px)</SelectItem>
                  <SelectItem value="medium">Medium (60px)</SelectItem>
                  <SelectItem value="large">Large (72px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Bubble Style</Label>
              <Select value={bubbleStyle} onValueChange={(v) => setBubbleStyle(v as WidgetSettings['bubbleStyle'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Animation</Label>
              <Select value={bubbleAnimation} onValueChange={(v) => setBubbleAnimation(v as WidgetSettings['bubbleAnimation'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pulse">Pulse</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="shake">Shake</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Shadow</Label>
                <p className="text-xs text-muted-foreground">Add shadow to bubble</p>
              </div>
              <Switch checked={bubbleShadow} onCheckedChange={setBubbleShadow} />
            </div>
          </div>

          {/* Live Preview */}
          {isMounted && (
            <div className="rounded-lg border bg-muted/50 p-6">
              <Label className="mb-4 block">Live Preview</Label>
              <div className="relative h-32 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                {bubbleIcon === 'glassOrb' ? (
                  <div 
                    className={`absolute flex items-center justify-center ${
                      position === 'bottom-right' ? 'bottom-3 right-3' : 'bottom-3 left-3'
                    } ${bubbleAnimation === 'pulse' ? 'animate-pulse' : ''} ${bubbleAnimation === 'bounce' ? 'animate-bounce' : ''}`}
                  >
                    <GlassOrbAvatar
                      glyph={glassOrbGlyph}
                      size={bubbleSize === 'small' ? 48 : bubbleSize === 'large' ? 72 : 60}
                      style={{ position: 'relative' }}
                    />
                  </div>
                ) : (
                  <div 
                    className={`absolute flex items-center justify-center rounded-full ${
                      position === 'bottom-right' ? 'bottom-3 right-3' : 'bottom-3 left-3'
                    } ${bubbleAnimation === 'pulse' ? 'animate-pulse' : ''} ${bubbleAnimation === 'bounce' ? 'animate-bounce' : ''}`}
                    style={{ 
                      background: bubbleStyle === 'gradient' 
                        ? `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)`
                        : bubbleStyle === 'outline' 
                          ? 'transparent' 
                          : primaryColor,
                      border: bubbleStyle === 'outline' ? `2px solid ${primaryColor}` : 'none',
                      color: bubbleStyle === 'outline' ? primaryColor : 'white',
                      width: bubbleSize === 'small' ? '48px' : bubbleSize === 'large' ? '72px' : '60px',
                      height: bubbleSize === 'small' ? '48px' : bubbleSize === 'large' ? '72px' : '60px',
                      boxShadow: bubbleShadow ? `0 4px 16px ${primaryColor}66` : 'none',
                      overflow: 'hidden',
                    }}
                  >
                    {(() => {
                      const IconComponent = BUBBLE_ICONS.find(i => i.id === bubbleIcon)?.icon || MessageCircle
                      return <IconComponent className={`${bubbleSize === 'small' ? 'h-5 w-5' : bubbleSize === 'large' ? 'h-8 w-8' : 'h-6 w-6'}`} />
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          <Button onClick={handleSaveOrganization} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Bubble Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
