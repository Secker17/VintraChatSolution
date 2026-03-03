'use client'

import { useState, useEffect, useRef, use } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Send, X, Bot, User, Loader2, UserRound } from 'lucide-react'

interface WidgetConfig {
  organizationId: string
  name: string
  settings: {
    primaryColor: string
    position: string
    welcomeMessage: string
    offlineMessage: string
    avatar: string | null
    showBranding: boolean
  }
  aiEnabled: boolean
  aiWelcomeMessage: string
  isOnline: boolean
}

interface Message {
  id: string
  sender_type: 'visitor' | 'agent' | 'ai' | 'system'
  content: string
  created_at: string
}

export default function WidgetEmbedPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [isRequestingHandoff, setIsRequestingHandoff] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Generate session ID
  useEffect(() => {
    let id = localStorage.getItem('vintrachat_session_id')
    if (!id) {
      id = 'vc_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('vintrachat_session_id', id)
    }
    setSessionId(id)

    // Check for existing conversation
    const savedConvId = localStorage.getItem('vintrachat_conversation_id')
    if (savedConvId) {
      setConversationId(savedConvId)
      setShowIntro(false)
    }
  }, [])

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

  // Fetch existing messages
  useEffect(() => {
    if (conversationId) {
      fetchMessages()
      // Start polling for new messages
      pollingRef.current = setInterval(fetchMessages, 3000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [conversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    if (!conversationId) return
    try {
      const res = await fetch(`/api/widget/messages?conversationId=${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || !config || isSending) return

    setIsSending(true)
    const messageContent = inputValue.trim()
    setInputValue('')

    // Optimistic update
    const tempId = 'temp_' + Date.now()
    setMessages(prev => [...prev, {
      id: tempId,
      sender_type: 'visitor',
      content: messageContent,
      created_at: new Date().toISOString(),
    }])

    try {
      const res = await fetch('/api/widget/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: config.organizationId,
          sessionId,
          message: messageContent,
          visitorName: visitorName || undefined,
          visitorEmail: visitorEmail || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId)
          localStorage.setItem('vintrachat_conversation_id', data.conversationId)
        }

        // Replace temp message with real one and add AI response if any
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempId)
          const newMessages = [...filtered, data.message]
          if (data.aiResponse) {
            newMessages.push(data.aiResponse)
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInputValue(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  async function handleRequestHuman() {
    if (!conversationId || handoffRequested) return
    setIsRequestingHandoff(true)
    try {
      await fetch('/api/widget/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })
      setHandoffRequested(true)
    } catch (e) {
      console.error('Handoff request failed', e)
    } finally {
      setIsRequestingHandoff(false)
    }
  }

  function handleStartChat() {
    setShowIntro(false)
  }

  function handleClose() {
    window.parent.postMessage('vintrachat:close', '*')
  }

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

  const primaryColor = config.settings.primaryColor || '#0066FF'

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div 
        className="flex h-16 items-center justify-between px-4 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarFallback className="bg-white/20 text-white">
              {config.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{config.name}</p>
            <p className="text-xs opacity-80">
              {config.isOnline ? 'Online' : 'We\'ll reply soon'}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      {showIntro ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div 
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: primaryColor + '20' }}
          >
            <Bot className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {config.settings.welcomeMessage || 'Hi there!'}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            {config.isOnline 
              ? 'Our team is here to help. Send us a message!'
              : config.settings.offlineMessage || 'Leave us a message and we\'ll get back to you.'}
          </p>
          
          <div className="w-full max-w-xs space-y-3">
            <Input
              placeholder="Your name (optional)"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Your email (optional)"
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
            />
            <Button 
              className="w-full" 
              style={{ backgroundColor: primaryColor }}
              onClick={handleStartChat}
            >
              Start Chat
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {config.settings.welcomeMessage || 'Send a message to start chatting!'}
                  </p>
                </div>
              )}
              {messages.map((msg) => {
                const isVisitor = msg.sender_type === 'visitor'
                const isAI = msg.sender_type === 'ai'

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2',
                      isVisitor && 'flex-row-reverse'
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn(
                        !isVisitor && 'text-white'
                      )} style={{ backgroundColor: !isVisitor ? primaryColor : undefined }}>
                        {isVisitor ? <User className="h-4 w-4" /> : isAI ? <Bot className="h-4 w-4" /> : 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2 max-w-[80%]',
                        isVisitor ? 'text-white' : 'bg-muted'
                      )}
                      style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                    >
                      {isAI && (
                        <p className="text-xs text-muted-foreground mb-1">AI Assistant</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Handoff status banner */}
          {handoffRequested && (
            <div className="border-t px-4 py-2 flex items-center gap-2 text-sm" style={{ backgroundColor: primaryColor + '15' }}>
              <UserRound className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
              <span className="text-muted-foreground">Waiting for a human agent to join...</span>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            {/* Talk to human button — only show when AI has responded and no handoff yet */}
            {!handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  disabled={isRequestingHandoff}
                  className="w-full text-xs py-1.5 px-3 rounded-lg border transition-colors hover:bg-muted disabled:opacity-50"
                  style={{ borderColor: primaryColor + '60', color: primaryColor }}
                >
                  {isRequestingHandoff ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Requesting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <UserRound className="h-3 w-3" /> Talk to a human
                    </span>
                  )}
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSending}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isSending || !inputValue.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* Branding */}
      {config.settings.showBranding && (
        <div className="py-2 text-center text-xs text-muted-foreground border-t">
          Powered by <span className="font-medium">VintraChat</span>
        </div>
      )}
    </div>
  )
}
