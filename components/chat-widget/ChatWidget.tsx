'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChatHeader } from './ChatHeader'
import { ChatMain } from './ChatMain'
import { ChatFooter } from './ChatFooter'
import type { ChatMessage, ChatWidgetConfig, WidgetSettings } from './types'
import './styles/chat-widget.css'

interface ChatWidgetProps {
  config: ChatWidgetConfig
  isPreview?: boolean
  onClose?: () => void
  className?: string
}

export function ChatWidget({ 
  config, 
  isPreview = false,
  onClose,
  className 
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleInputChange = (value: string) => {
    setInputValue(value)
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender_type: 'visitor',
      content: inputValue.trim(),
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsSending(true)

    try {
      if (isPreview) {
        // Mock response for preview
        setTimeout(() => {
          const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender_type: config.aiEnabled ? 'ai' : 'agent',
            content: config.aiEnabled 
              ? "Thanks for your message! This is a preview response from the AI assistant."
              : "Thanks for your message! This is a preview response from our team.",
            created_at: new Date().toISOString()
          }
          setMessages(prev => [...prev, botMessage])
          setIsSending(false)
        }, 1000)
      } else {
        // Real API call would go here
        // For now, just simulate a response
        setTimeout(() => {
          const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender_type: config.aiEnabled ? 'ai' : 'agent',
            content: "Message received! Our team will get back to you soon.",
            created_at: new Date().toISOString()
          }
          setMessages(prev => [...prev, botMessage])
          setIsSending(false)
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsSending(false)
    }
  }

  return (
    <div className={cn("chatWidget", className)}>
      <ChatHeader
          config={config}
          onClose={onClose}
        />
      <div className="chatWidgetInner">
        <ChatMain
          messages={messages}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSend={handleSend}
          isSending={isSending}
          config={config}
        />
        
        <ChatFooter
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSend={handleSend}
          isSending={isSending}
          settings={{
            allowFileUpload: config.settings.allowFileUpload,
            allowEmoji: config.settings.allowEmoji,
            soundEnabled: config.settings.soundEnabled
          }}
        />
      </div>
    </div>
  )
}

export type { ChatMessage, ChatWidgetConfig, WidgetSettings }
