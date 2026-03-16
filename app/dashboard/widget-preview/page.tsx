"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Copy, Check, Smartphone, Monitor, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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

      {/* Installation Code */}
      {widgetCode && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Installation Code</CardTitle>
            <CardDescription>Add this code to your website before the closing {'</body>'} tag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
                {widgetCode}
              </code>
              <Button size="icon" variant="outline" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          </div>

          {/* Preview Frame */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 ${previewDevice === 'mobile' ? 'py-8' : 'py-6'}`}>
                {previewDevice === 'mobile' ? (
                  /* Mobile Frame */
                  <div className="relative">
                    <div className="w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-10" />
                      <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[2.25rem] overflow-hidden relative">
                        {widgetInfo?.widgetKey ? (
                          <iframe
                            src={`/widget/embed/${widgetInfo.widgetKey}?preview=true`}
                            className="w-full h-full border-0"
                            title="Widget Preview"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No widget configured</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Desktop Frame */
                  <div className="w-full max-w-4xl">
                    <div className="bg-slate-700 dark:bg-slate-800 rounded-t-lg p-2 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 bg-slate-600 dark:bg-slate-700 rounded px-3 py-1 text-xs text-slate-300 text-center truncate">
                        yourwebsite.com
                      </div>
                    </div>
                    <div className="h-[500px] bg-white dark:bg-slate-950 border-x border-b rounded-b-lg overflow-hidden">
                      {widgetInfo?.widgetKey ? (
                        <iframe
                          src={`/widget/embed/${widgetInfo.widgetKey}?preview=true`}
                          className="w-full h-full border-0"
                          title="Widget Preview"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No widget configured</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Replies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Replies</CardTitle>
              <CardDescription>Pre-written options for visitors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickReplies.map((reply) => (
                <div key={reply.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group">
                  <span className="flex-1 text-sm truncate">{reply.text}</span>
                  <button
                    onClick={() => handleRemoveQuickReply(reply.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
              
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Add quick reply..."
                  value={newQuickReply}
                  onChange={(e) => setNewQuickReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuickReply()}
                  className="text-sm"
                />
                <Button size="icon" variant="outline" onClick={handleAddQuickReply} disabled={!newQuickReply.trim()}>
                  <Plus className="h-4 w-4" />
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
              
              <div className="flex gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={loadWidgetInfo} className="flex-1">
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Refresh
                </Button>
                {widgetInfo?.widgetKey && (
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <a href={`/widget/embed/${widgetInfo.widgetKey}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Full Screen
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
