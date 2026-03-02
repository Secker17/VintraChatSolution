'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, Code, Globe, Zap } from 'lucide-react'
import type { Organization } from '@/lib/types'

interface InstallationGuideProps {
  organization: Organization
}

export function InstallationGuide({ organization }: InstallationGuideProps) {
  const [copied, setCopied] = useState(false)
  const widgetKey = organization.widget_key

  // Use window.location.origin in client, or fallback
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'

  const scriptCode = `<!-- VintraChat Widget -->
<script>
  (function(w,d,s,k){
    w.VintraChatConfig={widgetKey:k};
    var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s);
    j.async=true;
    j.src='${baseUrl}/widget/chatflow.js';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','${widgetKey}');
</script>`

  const npmCode = `npm install @vintrachat/react

// In your React app
import { VintraChatWidget } from '@vintrachat/react'

function App() {
  return (
    <VintraChatWidget widgetKey="${widgetKey}" />
  )
}`

  const iframeCode = `<iframe
  src="${baseUrl}/widget/embed/${widgetKey}"
  style="position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.15);"
></iframe>`

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Installation</h1>
        <p className="text-muted-foreground mt-1">
          Add the VintraChat widget to your website in minutes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Your Widget Key</CardTitle>
              <CardDescription>Use this key to identify your organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-muted px-4 py-3 font-mono text-sm">
              {widgetKey}
            </code>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleCopy(widgetKey)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installation Methods</CardTitle>
          <CardDescription>
            Choose the method that works best for your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="script" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="script" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Script Tag
              </TabsTrigger>
              <TabsTrigger value="npm" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                NPM Package
              </TabsTrigger>
              <TabsTrigger value="iframe" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                iFrame
              </TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Recommended</Badge>
                <span className="text-sm text-muted-foreground">
                  Works with any website
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this script tag just before the closing {'</body>'} tag of your website:
              </p>
              <div className="relative">
                <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
                  <code>{scriptCode}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(scriptCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="npm" className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Coming Soon</Badge>
                <span className="text-sm text-muted-foreground">
                  For React/Next.js applications
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Install and use the VintraChat React component:
              </p>
              <div className="relative">
                <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
                  <code>{npmCode}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(npmCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="iframe" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Embed the chat widget using an iFrame:
              </p>
              <div className="relative">
                <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
                  <code>{iframeCode}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(iframeCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Your Widget</CardTitle>
          <CardDescription>
            Preview how the widget will look on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={`/dashboard/widget-preview`}>
              Open Widget Preview
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
