"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertCircle, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function WidgetPreviewPage() {
  const [widgetKey, setWidgetKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [installationStatus, setInstallationStatus] = useState<'checking' | 'installed' | 'not_installed' | 'unknown'>('unknown')
  const supabase = createClient()
  const { toast } = useToast()

  const loadWidgetKey = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Get org via team_members
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("organizations(widget_key)")
      .eq("user_id", user.id)
      .single()

    if (teamMember?.organizations) {
      const org = Array.isArray(teamMember.organizations) 
        ? teamMember.organizations[0] 
        : teamMember.organizations
      if (org?.widget_key) {
        setWidgetKey(org.widget_key)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadWidgetKey()
  }, [loadWidgetKey])

  // Check if widget has been used (any conversations exist)
  useEffect(() => {
    if (!widgetKey) return

    const checkInstallation = async () => {
      setInstallationStatus('checking')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: teamMember } = await supabase
        .from("team_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single()

      if (!teamMember) return

      // Check if any conversations or visitors exist
      const { count: visitorCount } = await supabase
        .from("visitors")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", teamMember.organization_id)

      if (visitorCount && visitorCount > 0) {
        setInstallationStatus('installed')
      } else {
        setInstallationStatus('not_installed')
      }
    }

    checkInstallation()
  }, [widgetKey, supabase])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const previewUrl = widgetKey ? `/widget/embed/${widgetKey}` : null
  const widgetCode = widgetKey 
    ? `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-widget-key="${widgetKey}"></script>`
    : null

  return (
    <div className="p-6 space-y-6 min-h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widget Preview</h1>
          <p className="text-muted-foreground">
            Test your chat widget before adding it to your website.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {installationStatus === 'checking' && (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Checking...
            </Badge>
          )}
          {installationStatus === 'installed' && (
            <Badge variant="default" className="gap-1 bg-emerald-500">
              <CheckCircle2 className="h-3 w-3" />
              Widget Active
            </Badge>
          )}
          {installationStatus === 'not_installed' && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Not Detected Yet
            </Badge>
          )}
        </div>
      </div>

      {/* Installation Code */}
      {widgetCode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Installation Code</CardTitle>
            <CardDescription>
              Add this code to your website, just before the closing {'</body>'} tag.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {widgetCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={handleCopyCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              This is how your chat widget will appear to visitors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: "500px" }}>
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Chat Widget Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <div className="text-center">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
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
                Send a test message
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Type a message in the widget preview to start a conversation.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                Check your inbox
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                The message will appear in your dashboard inbox in real-time.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                Reply to the visitor
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Send a response from your inbox and watch it appear in the widget.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
                Test AI responses
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                If AI is enabled, go offline and the AI will respond automatically.
              </p>
            </div>

            <div className="flex gap-2 pt-4 border-t mt-6">
              <Button variant="outline" onClick={loadWidgetKey}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {previewUrl && (
                <Button variant="outline" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Full Screen
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
