'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ChatHeader } from './chat-header'
import { ChatMain } from './chat-main'
import { ChatFooter } from './chat-footer'
import { ChatMessage, ChatWidgetConfig, WidgetSettings } from './types'

interface ChatWidgetProps {
  config: ChatWidgetConfig
  isPreview?: boolean
  onClose?: () => void
  className?: string
}

export function ChatWidget({ config, isPreview = false, onClose, className }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [aiEnabled, setAiEnabled] = useState(config.aiEnabled || false)
  const [handoffRequested, setHandoffRequested] = useState(false)

  // Generate session ID on mount
  useEffect(() => {
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    setSessionId(newSessionId)
  }, [])

  // Load existing messages
  useEffect(() => {
    if (sessionId && config.organizationId) {
      loadMessages()
    }
  }, [sessionId, config.organizationId])

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/widget/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: config.organizationId,
          sessionId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender_type: 'visitor',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsSending(true)

    try {
      const res = await fetch('/api/widget/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: config.organizationId,
          sessionId,
          message: userMessage.content,
          senderType: 'visitor',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          setMessages(prev => [...prev, data.message])
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message
      const errorMessage: ChatMessage = {
        id: 'error_' + Date.now(),
        sender_type: 'system',
        content: 'Sorry, there was an error sending your message. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handleAiToggle = () => {
    setAiEnabled(!aiEnabled)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-white/80 backdrop-blur-xl overflow-hidden rounded-4xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20",
      className
    )}>
      {/* Header */}
      <ChatHeader
        config={{
          name: config.name,
          settings: config.settings,
          isOnline: config.isOnline
        }}
        onClose={onClose}
        onAiToggle={handleAiToggle}
        aiEnabled={aiEnabled}
      />

      {/* Main Content */}
      <ChatMain
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        isSending={isSending}
        config={config}
      />

      {/* Footer */}
      <ChatFooter
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        isSending={isSending}
        placeholder={aiEnabled ? "Ask AI anything..." : "Type your message..."}
      />
    </div>
  )
}

export type { ChatMessage, ChatWidgetConfig, WidgetSettings }
