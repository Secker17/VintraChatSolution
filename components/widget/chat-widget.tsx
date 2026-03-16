'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Send, X, Bot, User, Loader2, UserRound, Sparkles, MessageCircle, ChevronDown, Smile, Paperclip } from 'lucide-react'
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
      "flex h-full flex-col bg-white dark:bg-slate-950 overflow-hidden rounded-2xl shadow-2xl",
      className
    )}>
      {/* Header - Fixed height with proper padding */}
      <div 
        className="shrink-0 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}e6 100%)` 
        }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#dots)"/>
          </svg>
        </div>

        {/* Header content */}
        <div className="relative px-4 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {config.settings.bubbleIcon === 'glassOrb' ? (
              <div className="relative">
                <GlassOrbAvatar
                  glyph={config.settings.glassOrbGlyph || 'V'}
                  glyphFont="Times New Roman"
                  size={44}
                  variant="chatHeader"
                  interactive={false}
                  forceState="idle"
                  style={{ position: 'relative', width: '44px', height: '44px' }}
                  className="rounded-full ring-2 ring-white/30 shadow-lg"
                />
                <span className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                  config.isOnline ? "bg-green-400" : "bg-gray-400"
                )} />
              </div>
            ) : (
              <div className="relative">
                <div 
                  className="h-11 w-11 rounded-full flex items-center justify-center text-lg font-bold ring-2 ring-white/30 shadow-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {config.name.charAt(0).toUpperCase()}
                </div>
                <span className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                  config.isOnline ? "bg-green-400" : "bg-gray-400"
                )} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">{config.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {config.isOnline ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"></span>
                    </span>
                    <span className="text-xs text-white/80">Online</span>
                  </>
                ) : (
                  <span className="text-xs text-white/70">We&apos;ll reply soon</span>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
        {showIntro ? (
          /* Intro Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div 
              className="mb-5 h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <MessageCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
              {config.settings.welcomeMessage || 'Hi there!'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[260px]">
              {config.isOnline 
                ? 'We typically reply within a few minutes.'
                : config.settings.offlineMessage || 'Leave a message and we\'ll get back to you.'}
            </p>
            
            <div className="w-full max-w-[280px] space-y-3">
              <Input
                placeholder="Your name (optional)"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <Input
                type="email"
                placeholder="Your email (optional)"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                className="h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <Button 
                className="w-full h-11 rounded-xl font-medium text-white shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
                onClick={handleStartChat}
              >
                Start Conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Welcome card when no messages */}
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div 
                      className="rounded-xl p-4 border"
                      style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-white mb-1">AI Assistant</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {config.settings.welcomeMessage || 'Hi! How can I help you today?'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Replies */}
                    {showQuickReplies && quickReplies.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide px-1">Suggested</p>
                        <div className="flex flex-wrap gap-2">
                          {quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              onClick={() => handleQuickReply(reply.text)}
                              className="px-3 py-2 text-sm font-medium rounded-lg border bg-white dark:bg-slate-800 transition-all hover:shadow-sm active:scale-[0.98]"
                              style={{ 
                                borderColor: `${primaryColor}30`, 
                                color: primaryColor 
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

                {/* Messages */}
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
                        isConsecutive ? 'mt-1' : 'mt-3'
                      )}
                    >
                      {!isConsecutive && (
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
                          isVisitor 
                            ? "bg-slate-200 dark:bg-slate-700" 
                            : "text-white"
                        )} style={!isVisitor ? { backgroundColor: primaryColor } : undefined}>
                          {isVisitor ? <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" /> : isAI ? <Bot className="h-3.5 w-3.5" /> : 'A'}
                        </div>
                      )}
                      {isConsecutive && <div className="w-7 shrink-0" />}
                      
                      <div className={cn("max-w-[80%]", isVisitor && "text-right")}>
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-sm',
                            isVisitor 
                              ? 'text-white rounded-tr-sm' 
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm text-slate-800 dark:text-slate-100'
                          )}
                          style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        {!isConsecutive && (
                          <p className={cn(
                            "text-[10px] mt-1 text-slate-400",
                            isVisitor ? "text-right pr-1" : "pl-1"
                          )}>
                            {time}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-2 mt-3">
                    <div 
                      className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <span 
                          className="h-2 w-2 rounded-full animate-bounce" 
                          style={{ backgroundColor: primaryColor, animationDelay: '0ms' }} 
                        />
                        <span 
                          className="h-2 w-2 rounded-full animate-bounce" 
                          style={{ backgroundColor: primaryColor, animationDelay: '150ms' }} 
                        />
                        <span 
                          className="h-2 w-2 rounded-full animate-bounce" 
                          style={{ backgroundColor: primaryColor, animationDelay: '300ms' }} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Request Human Button */}
            {!isPreview && !handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleRequestHuman}
                  disabled={isRequestingHandoff}
                  className="w-full text-xs py-2 px-3 rounded-lg border transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-1.5"
                  style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                >
                  {isRequestingHandoff ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Requesting...</>
                  ) : (
                    <><UserRound className="h-3 w-3" /> Talk to a human</>
                  )}
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="shrink-0 p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSending}
                    className="h-10 rounded-full pl-4 pr-10 bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSending || !inputValue.trim()}
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-all hover:shadow-md active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
              
              {/* Powered by */}
              {config.settings.showBranding !== false && (
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  Powered by <span className="font-medium">VintraChat</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export { ChatWidget as default }
