'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Bot, Loader2, Sparkles, Zap } from 'lucide-react'
import type { Organization, AISettings } from '@/lib/types'
import { getPlanLimits } from '@/lib/types'

interface AISettingsFormProps {
  organization: Organization
  aiSettings: AISettings | null
}

export function AISettingsForm({ organization, aiSettings }: AISettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [enabled, setEnabled] = useState(aiSettings?.enabled ?? true)
  const [welcomeMessage, setWelcomeMessage] = useState(
    aiSettings?.welcome_message || 'Hello! I\'m an AI assistant. How can I help you today?'
  )
  const [fallbackMessage, setFallbackMessage] = useState(
    aiSettings?.fallback_message || 'I\'m not sure about that. Let me connect you with a human agent.'
  )
  const [knowledgeBase, setKnowledgeBase] = useState(aiSettings?.knowledge_base || '')
  const [responseStyle, setResponseStyle] = useState(aiSettings?.response_style || 'friendly')
  const [autoRespondOffline, setAutoRespondOffline] = useState(
    aiSettings?.auto_respond_when_offline ?? true
  )

  const { toast } = useToast()
  const supabase = createClient()

  const planLimits = getPlanLimits(organization?.plan)
  const aiResponsesUsed = organization.ai_responses_used
  const aiResponsesLimit = planLimits.aiResponses
  const usagePercentage = aiResponsesLimit > 0 
    ? (aiResponsesUsed / aiResponsesLimit) * 100 
    : 0

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('ai_settings')
        .upsert({
          organization_id: organization.id,
          enabled,
          welcome_message: welcomeMessage,
          fallback_message: fallbackMessage,
          knowledge_base: knowledgeBase,
          response_style: responseStyle,
          auto_respond_when_offline: autoRespondOffline,
        }, { onConflict: 'organization_id' })

      if (error) throw error

      toast({
        title: 'AI settings saved',
        description: 'Your AI assistant settings have been updated.',
      })
    } catch (error) {
      console.error('Error saving AI settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground mt-1">
          Configure your AI-powered auto-response system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>AI Responses Usage</CardTitle>
              <CardDescription>
                {aiResponsesLimit === -1 
                  ? 'Unlimited AI responses on your plan'
                  : `${aiResponsesUsed} / ${aiResponsesLimit} responses used this month`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {aiResponsesLimit !== -1 && (
          <CardContent>
            <Progress value={usagePercentage} className="h-2" />
            {usagePercentage > 80 && (
              <p className="text-sm text-amber-600 mt-2">
                You're running low on AI responses. Consider upgrading your plan.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>AI Auto-Response</CardTitle>
                <CardDescription>
                  Automatically respond to visitors when agents are offline
                </CardDescription>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-respond when offline</Label>
              <p className="text-sm text-muted-foreground">
                AI will respond automatically when no agents are online
              </p>
            </div>
            <Switch
              checked={autoRespondOffline}
              onCheckedChange={setAutoRespondOffline}
              disabled={!enabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="responseStyle">Response Style</Label>
            <Select 
              value={responseStyle} 
              onValueChange={setResponseStyle}
              disabled={!enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly & Casual</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Very Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="welcomeMessage">AI Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hello! I'm an AI assistant..."
              rows={2}
              disabled={!enabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fallbackMessage">Fallback Message</Label>
            <Textarea
              id="fallbackMessage"
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              placeholder="I'm not sure about that..."
              rows={2}
              disabled={!enabled}
            />
            <p className="text-sm text-muted-foreground">
              This message is shown when the AI cannot answer a question
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="knowledgeBase">Knowledge Base</Label>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <Textarea
              id="knowledgeBase"
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="Add information about your products, services, FAQs, etc. The AI will use this to answer questions."
              rows={8}
              disabled={!enabled}
            />
            <p className="text-sm text-muted-foreground">
              Add information, FAQs, and context to help the AI answer questions about your business
            </p>
          </div>

          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save AI Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
