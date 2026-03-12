"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw } from "lucide-react"

export default function WidgetPreviewPage() {
  const [widgetKey, setWidgetKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadWidgetKey()
  }, [])

  async function loadWidgetKey() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: org } = await supabase
      .from("organizations")
      .select("widget_key")
      .eq("owner_id", user.id)
      .single()

    if (org) {
      setWidgetKey(org.widget_key)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const previewUrl = widgetKey ? `/widget/embed/${widgetKey}` : null

  return (
    <div className="p-6 space-y-6 min-h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Widget Preview</h1>
        <p className="text-muted-foreground">
          Test your chat widget before adding it to your website.
        </p>
      </div>

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
                <p className="text-muted-foreground">Widget not configured</p>
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
              <h4 className="font-medium">1. Send a test message</h4>
              <p className="text-sm text-muted-foreground">
                Type a message in the widget preview to start a conversation.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Check your inbox</h4>
              <p className="text-sm text-muted-foreground">
                The message will appear in your dashboard inbox in real-time.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Reply to the visitor</h4>
              <p className="text-sm text-muted-foreground">
                Send a response from your inbox and watch it appear in the widget.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">4. Test AI responses</h4>
              <p className="text-sm text-muted-foreground">
                If AI is enabled, go offline and the AI will respond automatically.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={loadWidgetKey}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Preview
              </Button>
              {previewUrl && (
                <Button variant="outline" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
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
