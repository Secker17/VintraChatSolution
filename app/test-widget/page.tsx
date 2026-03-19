'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, AlertCircle, Loader2 } from 'lucide-react'

export default function TestWidgetPage() {
  const [widgetKey, setWidgetKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWidgetKey()
  }, [])

  const fetchWidgetKey = async () => {
    try {
      const response = await fetch('/api/widget/info')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setWidgetKey(data.widgetKey)
    } catch (err) {
      console.error('Error fetching widget key:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const localhostScript = `<script src="http://localhost:3001/widget/vintrachat.js" data-widget-key="${widgetKey || 'YOUR_KEY_HERE'}" async></script>`
  const productionScript = `<script src="https://your-domain.com/widget/vintrachat.js" data-widget-key="${widgetKey || 'YOUR_KEY_HERE'}" async></script>`

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const testWidget = () => {
    if (!widgetKey) return
    
    // Remove any existing widget
    const existingContainer = document.getElementById('vintrachat-widget-container')
    if (existingContainer) {
      existingContainer.remove()
    }

    // Create and inject the widget script
    const script = document.createElement('script')
    script.src = 'http://localhost:3001/widget/vintrachat.js'
    script.setAttribute('data-widget-key', widgetKey)
    script.async = true
    document.body.appendChild(script)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading widget key...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Widget Test Page</h1>
          <p className="text-muted-foreground mt-2">
            Test your VintraChat widget and get installation codes
          </p>
        </div>

        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Error Loading Widget Key</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchWidgetKey} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Your Widget Key</CardTitle>
                <CardDescription>
                  This key is automatically fetched from your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted px-4 py-3 font-mono text-sm">
                    {widgetKey}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy(widgetKey || '')}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Widget</CardTitle>
                <CardDescription>
                  Click the button below to test the widget on this page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={testWidget} size="lg">
                  Load Widget on This Page
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  The widget should appear in the bottom-right corner of the screen
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Localhost</Badge>
                    <CardTitle>Development Script</CardTitle>
                  </div>
                  <CardDescription>
                    Use this for local development
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
                      <code>{localhostScript}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(localhostScript)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Production</Badge>
                    <CardTitle>Production Script</CardTitle>
                  </div>
                  <CardDescription>
                    Use this for your live website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
                      <code>{productionScript}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(productionScript)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
                <CardDescription>
                  Common issues and solutions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">500 Internal Server Error</h4>
                  <p className="text-sm text-muted-foreground">
                    Make sure your development server is running on port 3001. 
                    The widget script tries to connect to the same domain it's loaded from.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Widget not appearing</h4>
                  <p className="text-sm text-muted-foreground">
                    Check browser console for errors. Make sure the widget key is valid 
                    and you're logged in to the dashboard.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">CORS issues</h4>
                  <p className="text-sm text-muted-foreground">
                    The widget must be served from the same domain as your API endpoints 
                    or configure CORS properly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
