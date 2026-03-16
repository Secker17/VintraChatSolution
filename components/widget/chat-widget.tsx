'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Send, X, Bot, User, Loader2, UserRound, Sparkles, MessageCircle } from 'lucide-react'
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
  isPreview?: boolean
  onClose?: () => void
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
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  const quickReplies = config.settings.quickReplies || []
  const primaryColor = config.settings.primaryColor || '#6366f1'

  // Generate lighter and darker variants
  const lighterColor = primaryColor + '15'
  const mediumColor = primaryColor + '30'

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

    const savedConvId = localStorage.getItem('vintrachat_conversation_id')
    if (savedConvId) {
      setConversationId(savedConvId)
      setShowIntro(false)
    }
  }, [isPreview])

  useEffect(() => {
    if (isPreview || !conversationId) return
    
    fetchMessages()
    pollingRef.current = setInterval(fetchMessages, 1500)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [conversationId, isPreview])

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
    setShowQuickReplies(false)
    const messageContent = inputValue.trim()
    setInputValue('')

    const visitorMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender_type: 'visitor',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, visitorMsg])

    if (isPreview) {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const mockResponse: ChatMessage = {
          id: 'mock_' + Date.now(),
          sender_type: 'ai',
          content: 'Thanks for your message! This is a preview response. In production, you\'ll get real AI or agent responses.',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, mockResponse])
        setIsSending(false)
      }, 1500)
      return
    }

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
  }

  function handleClose() {
    if (onClose) {
      onClose()
    } else {
      window.parent.postMessage('vintrachat:close', '*')
    }
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 overflow-hidden",
      className
    )}>
      {/* Premium Header with gradient */}
      <div className="relative shrink-0">
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${primaryColor}bb 100%)` 
          }}
        />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
          />
          <div 
            className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
          />
        </div>

        {/* Header content */}
        <div className="relative px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {config.settings.bubbleIcon === 'glassOrb' ? (
              <div className="relative">
                <GlassOrbAvatar
                  glyph={config.settings.glassOrbGlyph || 'V'}
                  glyphFont="Times New Roman"
                  size={48}
                  variant="chatHeader"
                  interactive={false}
                  forceState="idle"
                  style={{ position: 'relative', width: '48px', height: '48px' }}
                  className="rounded-full ring-2 ring-white/20"
                />
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                  config.isOnline ? "bg-emerald-400" : "bg-slate-400"
                )} />
              </div>
            ) : (
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-white/20 shadow-lg">
                  <AvatarFallback 
                    className="text-lg font-bold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  >
                    {config.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                  config.isOnline ? "bg-emerald-400" : "bg-slate-400"
                )} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg leading-tight drop-shadow-sm">{config.name}</h3>
              <p className="text-sm text-white/80 flex items-center gap-1.5">
                {config.isOnline ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    Online now
                  </>
                ) : (
                  'We\'ll reply soon'
                )}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 transition-all"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {showIntro ? (
          /* Intro Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div 
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: lighterColor }}
            >
              <Sparkles className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
              {config.settings.welcomeMessage || 'Hey there!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed">
              {config.isOnline 
                ? 'We\'re here to help. Start a conversation and we\'ll get back to you shortly.'
                : config.settings.offlineMessage || 'Leave us a message and we\'ll get back to you.'}
            </p>
            
            <div className="w-full max-w-xs space-y-3">
              <Input
                placeholder="Your name (optional)"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-2"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <Input
                type="email"
                placeholder="Your email (optional)"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-2"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <Button 
                className="w-full h-12 rounded-xl font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: primaryColor }}
                onClick={handleStartChat}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Welcome message when no messages */}
                {messages.length === 0 && (
                  <div className="space-y-4">
                    {/* AI welcome card */}
                    <div 
                      className="rounded-2xl p-4 border shadow-sm"
                      style={{ backgroundColor: lighterColor, borderColor: mediumColor }}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white mb-1">AI Assistant</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {config.settings.welcomeMessage || 'Hi! How can I help you today? Ask me anything or choose from the options below.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Replies */}
                    {showQuickReplies && quickReplies.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-1">Quick options</p>
                        <div className="flex flex-wrap gap-2">
                          {quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              onClick={() => handleQuickReply(reply.text)}
                              className="px-4 py-2.5 text-sm font-medium rounded-xl border-2 transition-all hover:shadow-md active:scale-95"
                              style={{ 
                                borderColor: mediumColor, 
                                color: primaryColor,
                                backgroundColor: 'white'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = lighterColor
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                              }}
                            >
                              {reply.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, idx) => {
                  const isVisitor = msg.sender_type === 'visitor'
                  const isAI = msg.sender_type === 'ai'
                  const isConsecutive = idx > 0 && messages[idx - 1].sender_type === msg.sender_type
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300',
                        isVisitor && 'flex-row-reverse',
                        isConsecutive ? 'mt-1' : 'mt-4'
                      )}
                    >
                      {!isConsecutive ? (
                        <Avatar className={cn(
                          "h-8 w-8 shrink-0 shadow-md",
                          isVisitor && "ring-2 ring-slate-200"
                        )}>
                          <AvatarFallback 
                            className={cn(!isVisitor && 'text-white')} 
                            style={{ backgroundColor: !isVisitor ? primaryColor : '#e2e8f0' }}
                          >
                            {isVisitor ? <User className="h-4 w-4 text-slate-600" /> : isAI ? <Bot className="h-4 w-4" /> : 'A'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}
                      <div className={cn("max-w-[75%]", isVisitor && "text-right")}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3 shadow-sm',
                            isVisitor 
                              ? 'text-white rounded-tr-md' 
                              : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-md'
                          )}
                          style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                        >
                          {isAI && !isConsecutive && (
                            <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: primaryColor }}>
                              <Sparkles className="h-3 w-3" />
                              AI Assistant
                            </p>
                          )}
                          <p className={cn(
                            "text-sm whitespace-pre-wrap leading-relaxed",
                            !isVisitor && "text-slate-700 dark:text-slate-200"
                          )}>
                            {msg.content}
                          </p>
                        </div>
                        <p className={cn(
                          "text-[10px] mt-1 px-1 text-slate-400",
                          isVisitor && "text-right"
                        )}>
                          {time}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Avatar className="h-8 w-8 shrink-0 shadow-md">
                      <AvatarFallback className="text-white" style={{ backgroundColor: primaryColor }}>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Handoff banner */}
            {handoffRequested && (
              <div 
                className="border-t px-4 py-3 flex items-center gap-3 shrink-0"
                style={{ backgroundColor: lighterColor, borderColor: mediumColor }}
              >
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <UserRound className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  A human agent will join shortly...
                </span>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              {/* Human handoff button */}
              {!isPreview && !handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={handleRequestHuman}
                    disabled={isRequestingHandoff}
                    className="w-full text-sm py-2.5 px-4 rounded-xl border-2 font-medium transition-all hover:shadow-md disabled:opacity-50 active:scale-[0.98]"
                    style={{ 
                      borderColor: mediumColor, 
                      color: primaryColor,
                      backgroundColor: lighterColor 
                    }}
                  >
                    {isRequestingHandoff ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Requesting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <UserRound className="h-4 w-4" /> Talk to a human
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {/* Message input */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSending}
                  className="flex-1 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 focus-visible:ring-2 transition-all"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSending || !inputValue.trim()}
                  className="h-12 w-12 rounded-xl shrink-0 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Send className="h-5 w-5 text-white" />
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Branding footer */}
      {config.settings.showBranding && (
        <div className="py-2 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          Powered by <span className="font-semibold">VintraChat</span>
        </div>
      )}
    </div>
  )
}
