'use client'

import { useState, useEffect, use } from 'react'
import { Loader2 } from 'lucide-react'
import { ChatWidget, type ChatWidgetConfig } from '@/components/widget'
import type { WidgetSettings } from '@/lib/types'

interface WidgetConfig {
  organizationId: string
  name: string
  settings: WidgetSettings
  aiEnabled: boolean
  aiWelcomeMessage: string
  isOnline: boolean
}

export default function WidgetEmbedPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch widget config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/widget/config?key=${key}`)
        if (res.ok) {
          const data = await res.json()
          setConfig(data)
        }
      } catch (error) {
        console.error('Failed to fetch widget config:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [key])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 text-center">
        <p className="text-muted-foreground">Widget not found</p>
      </div>
    )
  }

  const chatConfig: ChatWidgetConfig = {
    organizationId: config.organizationId,
    name: config.name,
    settings: config.settings,
    aiEnabled: config.aiEnabled,
    aiWelcomeMessage: config.aiWelcomeMessage,
    isOnline: config.isOnline,
  }

  return (
    <div className="h-screen">
      <ChatWidget 
        config={chatConfig} 
        isPreview={false}
      />
    </div>
  )
}
