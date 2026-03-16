"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WidgetPreview } from "@/components/widget"
import type { WidgetSettings } from "@/lib/types"

interface WidgetInfo {
  widgetKey: string
  hasVisitors: boolean
  name: string
  settings: WidgetSettings
}

interface QuickReply {
  id: string
  text: string
}

export default function WidgetPreviewPage() {
  const [widgetInfo, setWidgetInfo] = useState<WidgetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [installationStatus, setInstallationStatus] = useState<'checking' | 'installed' | 'not_installed' | 'unknown'>('unknown')
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([
    { id: '1', text: 'Pricing information' },
    { id: '2', text: 'Technical support' },
    { id: '3', text: 'Talk to sales' },
    { id: '4', text: 'Other question' },
  ])
  const [newQuickReply, setNewQuickReply] = useState('')
  const [isSavingReplies, setIsSavingReplies] = useState(false)
  const { toast } = useToast()

  const loadWidgetInfo = useCallback(async () => {
    setLoading(true)
    setInstallationStatus('checking')
    
    try {
      const response = await fetch('/api/widget/info')
      
      if (!response.ok) {
        throw new Error('Failed to fetch widget info')
      }
      
      const data = await response.json()
      
      if (data.widgetKey) {
        setWidgetInfo({
          widgetKey: data.widgetKey,
          hasVisitors: data.hasVisitors || false,
          name: data.name || 'Chat Widget',
          settings: data.settings || {
            primaryColor: '#0066FF',
            position: 'bottom-right',
            welcomeMessage: 'Hi! How can we help you today?',
            offlineMessage: 'We\'re currently offline. Leave us a message!',
            avatar: null,
            showBranding: true,
            bubbleIcon: 'chat',
            bubbleSize: 'medium',
            bubbleStyle: 'solid',
            bubbleShadow: true,
            bubbleAnimation: 'none',
          }
        })
        setInstallationStatus(data.hasVisitors ? 'installed' : 'not_installed')
        if (data.quickReplies?.length) {
          setQuickReplies(data.quickReplies)
        }
      } else {
        setWidgetInfo(null)
        setInstallationStatus('unknown')
      }
    } catch (error) {
      console.error('Error loading widget info:', error)
      setInstallationStatus('unknown')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWidgetInfo()
  }, [loadWidgetInfo])

  const handleCopyCode = async () => {
    if (!widgetInfo?.widgetKey) return
    
    const code = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-widget-key="${widgetInfo.widgetKey}"></script>`
    
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Widget code copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      })
    }
  }

  const handleAddQuickReply = () => {
    if (!newQuickReply.trim()) return
    setQuickReplies(prev => [...prev, { id: Date.now().toString(), text: newQuickReply.trim() }])
    setNewQuickReply('')
  }

  const handleRemoveQuickReply = (id: string) => {
    setQuickReplies(prev => prev.filter(r => r.id !== id))
  }

  const handleSaveQuickReplies = async () => {
    setIsSavingReplies(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickReplies }),
      })
      
      if (response.ok) {
        toast({
          title: "Saved!",
          description: "Quick replies have been updated",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save quick replies",
        variant: "destructive",
      })
    } finally {
      setIsSavingReplies(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-muted" />
            <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    )
  }

  const widgetCode = widgetInfo?.widgetKey 
    ? `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-widget-key="${widgetInfo.widgetKey}"></script>`
    : null

  return (
    <div className="p-6 space-y-6 min-h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widget Preview</h1>
          <p className="text-muted-foreground">
            Customize and preview your chat widget
          </p>
        </div>
        <div className="flex items-center gap-2">
          {installationStatus === 'checking' && (
            <Badge variant="secondary" className="gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Checking...
            </Badge>
          )}
          {installationStatus === 'installed' && (
            <Badge variant="default" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Widget Active
            </Badge>
          )}
          {installationStatus === 'not_installed' && (
            <Badge variant="secondary" className="gap-1.5">
              <AlertCircle className="h-3 w-3" />
              Not Detected
            </Badge>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Preview Column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Device Toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Preview</h2>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  previewDevice === 'mobile' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  previewDevice === 'desktop' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interactive Preview</CardTitle>
            <CardDescription>
              This is an exact replica of your deployed widget. Click the bubble to open and test the chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {widgetInfo ? (
              <WidgetPreview
                settings={widgetInfo.settings}
                name={widgetInfo.name}
                height={500}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Widget not configured</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
            <CardDescription>
              Follow these steps to test your chat widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                Click the chat bubble
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Click the bubble in the preview to open the chat window.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                Send a test message
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Type a message to see how the chat interaction works. In preview mode, you will receive a mock response.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                Test different settings
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Go to Settings to customize colors, position, bubble style, and more. Changes will be reflected here.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
                Install on your website
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Copy the installation code above and add it to your website. The production widget will use real AI responses.
              </p>
            </div>

            <div className="flex gap-2 pt-4 border-t mt-6">
              <Button variant="outline" onClick={loadWidgetInfo}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {widgetInfo?.widgetKey && (
                <Button variant="outline" asChild>
                  <a href={`/widget/embed/${widgetInfo.widgetKey}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Full Screen
                  </a>
                </Button>
              </div>

              <Button 
                size="sm" 
                className="w-full"
                onClick={handleSaveQuickReplies}
                disabled={isSavingReplies}
              >
                {isSavingReplies ? 'Saving...' : 'Save Quick Replies'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Test Your Widget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { step: 1, text: 'Send a test message in the preview' },
                { step: 2, text: 'Check your Inbox for the message' },
                { step: 3, text: 'Reply from the Inbox' },
                { step: 4, text: 'See reply appear in the widget' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium shrink-0 mt-0.5">
                    {step}
                  </span>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
