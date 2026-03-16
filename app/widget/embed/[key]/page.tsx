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
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-gray-200" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-t-blue-500 animate-spin" />
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-4 text-center">
        <div className="space-y-2">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <X className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Widget not found</p>
        </div>
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
