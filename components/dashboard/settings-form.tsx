'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageCircle, MessageSquare, HeadphonesIcon, HandIcon, Plus, X, GripVertical, HelpCircle, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import GlassOrbAvatar from '@/components/ui/glass-orb-avatar'
import { WidgetPreview } from '@/components/widget'
import type { Organization, TeamMember, WidgetSettings, FAQItem, QuickReply } from '@/lib/types'

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
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(
    organization.settings.quickReplies || [
      { id: '1', text: 'Pricing information' },
      { id: '2', text: 'Technical support' },
      { id: '3', text: 'Talk to sales' },
      { id: '4', text: 'Other question' },
    ]
  )
  const [newQuickReply, setNewQuickReply] = useState('')
  
  // Help Center / FAQ settings
  const [helpCenterEnabled, setHelpCenterEnabled] = useState(organization.settings.helpCenterEnabled ?? true)
  const [helpCenterTitle, setHelpCenterTitle] = useState(organization.settings.helpCenterTitle || 'Help Center')
  const [responseTimeText, setResponseTimeText] = useState(organization.settings.responseTimeText || 'We typically reply in a few minutes')
  const [faqItems, setFaqItems] = useState<FAQItem[]>(
    organization.settings.faqItems || [
      { id: '1', question: 'How do I get started?', answer: 'Simply click on "New Conversation" to start chatting with our team.' },
      { id: '2', question: 'What are your business hours?', answer: 'We are available 24/7 to assist you with any questions.' },
      { id: '3', question: 'How can I contact support?', answer: 'You can reach us through this chat or email us at support@example.com' },
    ]
  )
  const [editingFaq, setEditingFaq] = useState<string | null>(null)
  const [newFaqQuestion, setNewFaqQuestion] = useState('')
  const [newFaqAnswer, setNewFaqAnswer] = useState('')
  
  const { toast } = useToast()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSaveOrganization = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
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
            quickReplies,
            faqItems,
            helpCenterEnabled,
            helpCenterTitle,
            responseTimeText,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

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
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamMemberId: teamMember.id,
          displayName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save profile')
      }

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
    <div className="p-6 max-w-4xl mx-auto space-y-6 min-h-full">
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
              <Select value={position} onValueChange={(value: 'bottom-right' | 'bottom-left') => setPosition(value)}>
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
          <CardTitle>Quick Reply Buttons</CardTitle>
          <CardDescription>Pre-written options visitors can click to start a conversation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing quick replies */}
          <div className="space-y-2">
            {quickReplies.map((reply) => (
              <div 
                key={reply.id}
                className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 group"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
                <span className="flex-1 text-sm">{reply.text}</span>
                <button
                  type="button"
                  onClick={() => setQuickReplies(prev => prev.filter(r => r.id !== reply.id))}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-md transition-all"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new quick reply */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a quick reply option..."
              value={newQuickReply}
              onChange={(e) => setNewQuickReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newQuickReply.trim()) {
                  e.preventDefault()
                  setQuickReplies(prev => [...prev, { id: Date.now().toString(), text: newQuickReply.trim() }])
                  setNewQuickReply('')
                }
              }}
            />
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                if (newQuickReply.trim()) {
                  setQuickReplies(prev => [...prev, { id: Date.now().toString(), text: newQuickReply.trim() }])
                  setNewQuickReply('')
                }
              }}
              disabled={!newQuickReply.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            These buttons appear when visitors first open the chat widget.
          </p>

          <Button onClick={handleSaveOrganization} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Quick Replies
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help Center / FAQ
          </CardTitle>
          <CardDescription>Manage your knowledge base articles that appear in the widget</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Help Center */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Help Center</Label>
              <p className="text-sm text-muted-foreground">
                Show a searchable FAQ section in the widget
              </p>
            </div>
            <Switch
              checked={helpCenterEnabled}
              onCheckedChange={setHelpCenterEnabled}
            />
          </div>

          {helpCenterEnabled && (
            <>
              {/* Help Center Title */}
              <div className="grid gap-2">
                <Label htmlFor="helpCenterTitle">Help Center Title</Label>
                <Input
                  id="helpCenterTitle"
                  value={helpCenterTitle}
                  onChange={(e) => setHelpCenterTitle(e.target.value)}
                  placeholder="Help Center"
                />
              </div>

              {/* Response Time Text */}
              <div className="grid gap-2">
                <Label htmlFor="responseTimeText">Response Time Message</Label>
                <Input
                  id="responseTimeText"
                  value={responseTimeText}
                  onChange={(e) => setResponseTimeText(e.target.value)}
                  placeholder="We typically reply in a few minutes"
                />
                <p className="text-sm text-muted-foreground">
                  Shown below the "New Conversation" button
                </p>
              </div>

              {/* FAQ Items */}
              <div className="space-y-3">
                <Label>FAQ Articles</Label>
                {faqItems.map((faq) => (
                  <div 
                    key={faq.id}
                    className="rounded-lg border bg-muted/30 overflow-hidden"
                  >
                    {editingFaq === faq.id ? (
                      <div className="p-4 space-y-3">
                        <Input
                          value={faq.question}
                          onChange={(e) => setFaqItems(prev => 
                            prev.map(f => f.id === faq.id ? { ...f, question: e.target.value } : f)
                          )}
                          placeholder="Question"
                        />
                        <Textarea
                          value={faq.answer}
                          onChange={(e) => setFaqItems(prev => 
                            prev.map(f => f.id === faq.id ? { ...f, answer: e.target.value } : f)
                          )}
                          placeholder="Answer"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => setEditingFaq(null)}
                          >
                            Done
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              setFaqItems(prev => prev.filter(f => f.id !== faq.id))
                              setEditingFaq(null)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setEditingFaq(faq.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{faq.question}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{faq.answer}</p>
                        </div>
                        <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Add new FAQ */}
                <div className="rounded-lg border bg-background p-4 space-y-3">
                  <p className="text-sm font-medium">Add New FAQ</p>
                  <Input
                    value={newFaqQuestion}
                    onChange={(e) => setNewFaqQuestion(e.target.value)}
                    placeholder="Question (e.g., How do I reset my password?)"
                  />
                  <Textarea
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Answer"
                    rows={3}
                  />
                  <Button
                    onClick={() => {
                      if (newFaqQuestion.trim() && newFaqAnswer.trim()) {
                        setFaqItems(prev => [...prev, {
                          id: Date.now().toString(),
                          question: newFaqQuestion.trim(),
                          answer: newFaqAnswer.trim(),
                        }])
                        setNewFaqQuestion('')
                        setNewFaqAnswer('')
                      }
                    }}
                    disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add FAQ
                  </Button>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSaveOrganization} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Help Center Settings
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
                        glyphFont="Times New Roman"
                        size={48}
                        variant="chatHeader"
                        interactive={false}
                        forceState="idle"
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
                      glyphFont="Times New Roman"
                      size={48}
                      variant="chatHeader"
                      interactive={false}
                      forceState="idle"
                      style={{ position: 'relative', width: '48px', height: '48px' }}
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

          {/* Live Preview - Interactive exact replica of the deployed widget */}
          {isMounted && (
            <div className="rounded-lg border bg-muted/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <Label>Interactive Preview</Label>
                <span className="text-xs text-muted-foreground">Click the bubble to test</span>
              </div>
              <WidgetPreview
                settings={{
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
                }}
                name={orgName || 'Preview Widget'}
                height={400}
              />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                This preview is an exact replica of how the widget will appear on your website
              </p>
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
