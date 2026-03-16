'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Send, X, Bot, User, Loader2, UserRound } from 'lucide-react'
import GlassOrbAvatar from '@/components/ui/glass-orb-avatar'
import type { WidgetSettings } from '@/lib/types'

export interface ChatWidgetConfig {
  organizationId?: string
  name: string
  settings: WidgetSettings
  aiEnabled?: boolean
  aiWelcomeMessage?: string
  isOnline?: boolean
}

export interface ChatMessage {
  id: string
  sender_type: 'visitor' | 'agent' | 'ai' | 'system'
  content: string
  created_at: string
}

interface ChatWidgetProps {
  config: ChatWidgetConfig
  /** Preview mode - uses mock responses instead of real API */
  isPreview?: boolean
  /** Called when user clicks close button */
  onClose?: () => void
  /** Custom class name */
  className?: string
}

export function ChatWidget({ config, isPreview = false, onClose, className }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [isRequestingHandoff, setIsRequestingHandoff] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  const quickReplies = config.settings.quickReplies || []

  // Generate session ID
  useEffect(() => {
    if (isPreview) {
      setSessionId('preview_session')
      return
    }
    
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
  }, [isPreview])

  // Fetch existing messages (only in production mode)
  useEffect(() => {
    if (isPreview || !conversationId) return
    
    fetchMessages()
    pollingRef.current = setInterval(fetchMessages, 3000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [conversationId, isPreview])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    if (!conversationId || isPreview) return
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
    if (!inputValue.trim() || isSending) return

    setIsSending(true)
    const messageContent = inputValue.trim()
    setInputValue('')

    // Add visitor message
    const visitorMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender_type: 'visitor',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, visitorMsg])

    if (isPreview) {
      // Mock response for preview mode
      setTimeout(() => {
        const mockResponse: ChatMessage = {
          id: 'mock_' + Date.now(),
          sender_type: 'ai',
          content: 'This is a test response. In production, this would be a real AI or agent response.',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, mockResponse])
        setIsSending(false)
      }, 1000)
      return
    }

    // Production API call
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

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== visitorMsg.id)
          const newMessages = [...filtered, data.message]
          if (data.aiResponse) {
            newMessages.push(data.aiResponse)
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.id !== visitorMsg.id))
      setInputValue(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  async function handleRequestHuman() {
    if (!conversationId || handoffRequested || isPreview) return
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

  function handleQuickReply(text: string) {
    setShowQuickReplies(false)
    setInputValue(text)
    // Auto-submit the quick reply
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
    setTimeout(() => {
      setInputValue(text)
    }, 0)
  }

  function handleClose() {
    if (onClose) {
      onClose()
    } else {
      window.parent.postMessage('vintrachat:close', '*')
    }
  }

  const primaryColor = config.settings.primaryColor || '#0066FF'

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div 
        className="relative flex h-20 items-center justify-between px-4 text-white shrink-0 overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white" />
          <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white" />
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          {config.settings.bubbleIcon === 'glassOrb' ? (
            <GlassOrbAvatar
              glyph={config.settings.glassOrbGlyph || 'V'}
              glyphFont="Times New Roman"
              size={44}
              variant="chatHeader"
              interactive={false}
              forceState="idle"
              style={{ position: 'relative', width: '44px', height: '44px' }}
              className="rounded-full ring-2 ring-white/30"
            />
          ) : (
            <Avatar className="h-11 w-11 ring-2 ring-white/30">
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                {config.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <p className="font-semibold text-lg leading-tight">{config.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "h-2 w-2 rounded-full",
                config.isOnline ? "bg-green-400 animate-pulse" : "bg-white/50"
              )} />
              <p className="text-xs text-white/80">
                {config.isOnline ? 'Online now' : 'We\'ll reply soon'}
              </p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 relative z-10"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
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
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground text-sm">
                      {config.settings.welcomeMessage || 'Send a message to start chatting!'}
                    </p>
                    
                    {/* Quick Replies */}
                    {showQuickReplies && quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center px-2">
                        {quickReplies.map((reply) => (
                          <button
                            key={reply.id}
                            onClick={() => handleQuickReply(reply.text)}
                            className="px-3 py-1.5 text-sm rounded-full border transition-colors hover:bg-muted"
                            style={{ borderColor: primaryColor + '40', color: primaryColor }}
                          >
                            {reply.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isVisitor = msg.sender_type === 'visitor'
                  const isAI = msg.sender_type === 'ai'
                  const isConsecutive = idx > 0 && messages[idx - 1].sender_type === msg.sender_type
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2',
                        isVisitor && 'flex-row-reverse',
                        isConsecutive && 'mt-1'
                      )}
                    >
                      {!isConsecutive ? (
                        <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                          <AvatarFallback className={cn(
                            !isVisitor && 'text-white'
                          )} style={{ backgroundColor: !isVisitor ? primaryColor : undefined }}>
                            {isVisitor ? <User className="h-4 w-4" /> : isAI ? <Bot className="h-4 w-4" /> : 'A'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}
                      <div className={cn("max-w-[80%]", isVisitor && "text-right")}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5 shadow-sm',
                            isVisitor 
                              ? 'text-white rounded-br-md' 
                              : 'bg-muted rounded-bl-md'
                          )}
                          style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                        >
                          {isAI && !isConsecutive && (
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              AI Assistant
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        <p className={cn(
                          "text-[10px] mt-1 text-muted-foreground",
                          isVisitor && "text-right"
                        )}>
                          {time}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Handoff status banner */}
            {handoffRequested && (
              <div className="border-t px-4 py-2 flex items-center gap-2 text-sm shrink-0" style={{ backgroundColor: primaryColor + '15' }}>
                <UserRound className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span className="text-muted-foreground">Waiting for a human agent to join...</span>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3 shrink-0 bg-background">
              {!isPreview && !handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={handleRequestHuman}
                    disabled={isRequestingHandoff}
                    className="w-full text-xs py-2 px-3 rounded-lg border-2 transition-all hover:bg-muted disabled:opacity-50 font-medium"
                    style={{ borderColor: primaryColor + '40', color: primaryColor }}
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
                  className="flex-1 rounded-full px-4 border-2 focus-visible:ring-1"
                  style={{ borderColor: isSending ? undefined : primaryColor + '20' }}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSending || !inputValue.trim()}
                  className="rounded-full h-10 w-10 shrink-0 transition-transform hover:scale-105"
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
      </div>

      {/* Branding */}
      {config.settings.showBranding && (
        <div className="py-2 text-center text-xs text-muted-foreground border-t">
          Powered by <span className="font-medium">VintraChat</span>
        </div>
      )}
    </div>
  )
}
