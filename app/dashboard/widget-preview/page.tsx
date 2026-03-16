"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Copy, Check, Plus, X, Trash2, GripVertical, Smartphone, Monitor, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickReply {
  id: string
  text: string
}

export default function WidgetPreviewPage() {
  const [widgetKey, setWidgetKey] = useState<string | null>(null)
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
        setWidgetKey(data.widgetKey)
        setInstallationStatus(data.hasVisitors ? 'installed' : 'not_installed')
        if (data.quickReplies?.length) {
          setQuickReplies(data.quickReplies)
        }
      } else {
        setWidgetKey(null)
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
    if (!widgetKey) return
    
    const code = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-widget-key="${widgetKey}"></script>`
    
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

  const previewUrl = widgetKey ? `/widget/embed/${widgetKey}` : null
  const widgetCode = widgetKey 
    ? `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-widget-key="${widgetKey}"></script>`
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
          </div>

          {/* Preview Container */}
          <div 
            className={`relative mx-auto transition-all duration-300 ${
              previewDevice === 'mobile' 
                ? 'max-w-[375px]' 
                : 'max-w-full'
            }`}
          >
            {previewDevice === 'mobile' && (
              /* Mobile Frame */
              <div className="relative">
                {/* Phone frame */}
                <div className="rounded-[40px] border-[8px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10" />
                  
                  {/* Screen */}
                  <div className="rounded-[32px] overflow-hidden bg-white" style={{ height: '667px' }}>
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="Chat Widget Preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <div className="text-center">
                          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                          <p className="text-muted-foreground text-sm">Widget not configured</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Reflection effect */}
                <div className="absolute inset-0 rounded-[40px] bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
              </div>
            )}

            {previewDevice === 'desktop' && (
              /* Desktop Browser Frame */
              <div className="rounded-xl border border-border bg-background shadow-xl overflow-hidden">
                {/* Browser toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border text-xs text-muted-foreground">
                      <span>yourwebsite.com</span>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" style={{ height: '500px' }}>
                  {/* Fake website content */}
                  <div className="absolute inset-0 p-8 opacity-30">
                    <div className="h-8 w-32 bg-foreground/20 rounded mb-6" />
                    <div className="space-y-3">
                      <div className="h-4 w-3/4 bg-foreground/10 rounded" />
                      <div className="h-4 w-1/2 bg-foreground/10 rounded" />
                      <div className="h-4 w-2/3 bg-foreground/10 rounded" />
                    </div>
                  </div>
                  
                  {/* Widget embedded in corner */}
                  <div className="absolute bottom-4 right-4 w-[380px] h-[480px] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="Chat Widget Preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
                        <p className="text-muted-foreground text-sm">Widget not configured</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={loadWidgetInfo}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {previewUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Screen
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Settings Column */}
        <div className="space-y-4">
          {/* Installation Code */}
          {widgetCode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Installation Code</CardTitle>
                <CardDescription className="text-xs">
                  Add this before {'</body>'} tag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap break-all">
                    {widgetCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Replies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Replies</CardTitle>
              <CardDescription className="text-xs">
                Pre-written options visitors can click
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Existing replies */}
              <div className="space-y-2">
                {quickReplies.map((reply, index) => (
                  <div 
                    key={reply.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 group"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                    <span className="flex-1 text-sm truncate">{reply.text}</span>
                    <button
                      onClick={() => handleRemoveQuickReply(reply.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add quick reply..."
                  value={newQuickReply}
                  onChange={(e) => setNewQuickReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuickReply()}
                  className="h-9 text-sm"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleAddQuickReply}
                  disabled={!newQuickReply.trim()}
                  className="h-9 w-9 p-0"
                >
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
