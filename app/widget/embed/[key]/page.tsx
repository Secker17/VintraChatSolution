'use client'

import { useState, useEffect, useRef, use } from 'react'
import { cn } from '@/lib/utils'
import { Send, X, Minus, Bot, User, Loader2, UserRound, Sparkles, MessageCircle } from 'lucide-react'

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
    bubbleIcon?: string
    glassOrbGlyph?: string
    quickReplies?: Array<{ id: string; text: string; response?: string }>
    headerStyle?: 'default' | 'minimal' | 'gradient'
    chatBackground?: 'default' | 'subtle' | 'dots'
    typingIndicator?: boolean
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

// Default quick replies if none configured
const DEFAULT_QUICK_REPLIES = [
  { id: '1', text: 'Pricing information' },
  { id: '2', text: 'Technical support' },
  { id: '3', text: 'Talk to sales' },
  { id: '4', text: 'Other question' },
]

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
  const [isTyping, setIsTyping] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate session ID
  useEffect(() => {
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
      pollingRef.current = setInterval(fetchMessages, 3000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [conversationId])

  // Scroll to bottom
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

  async function sendMessage(content: string) {
    if (!content.trim() || !config || isSending) return

    setIsSending(true)
    setShowQuickReplies(false)
    const messageContent = content.trim()

    // Optimistic update
    const tempId = 'temp_' + Date.now()
    setMessages(prev => [...prev, {
      id: tempId,
      sender_type: 'visitor',
      content: messageContent,
      created_at: new Date().toISOString(),
    }])

    try {
      // Show typing indicator
      setIsTyping(true)
      
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

        // Small delay to simulate natural typing
        await new Promise(r => setTimeout(r, 500))
        setIsTyping(false)

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
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInputValue(messageContent)
    } finally {
      setIsSending(false)
      setIsTyping(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim()) return
    await sendMessage(inputValue)
    setInputValue('')
  }

  async function handleQuickReply(reply: { id: string; text: string }) {
    await sendMessage(reply.text)
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
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleClose() {
    window.parent.postMessage('vintrachat:close', '*')
  }

  function handleMinimize() {
    window.parent.postMessage('vintrachat:minimize', '*')
  }

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

  const primaryColor = config.settings.primaryColor || '#0066FF'
  const quickReplies = config.settings.quickReplies?.length ? config.settings.quickReplies : DEFAULT_QUICK_REPLIES

  // Calculate lighter shade for backgrounds
  const primaryLight = primaryColor + '15'
  const primaryMedium = primaryColor + '30'

  return (
    <div className="flex h-screen flex-col bg-white overflow-hidden">
      {/* Modern Header with gradient */}
      <header 
        className="relative shrink-0 overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10 bg-white" />
        
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div 
                  className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-semibold text-lg shadow-lg"
                >
                  {config.name.charAt(0).toUpperCase()}
                </div>
                {config.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white shadow-sm" />
                )}
              </div>
              <div className="text-white">
                <h1 className="font-semibold text-base leading-tight">{config.name}</h1>
                <p className="text-xs text-white/80 flex items-center gap-1.5">
                  {config.isOnline ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      Online now
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                      {"We'll reply soon"}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleMinimize}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button 
                onClick={handleClose}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        {showIntro ? (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
              {/* Animated icon */}
              <div 
                className="mb-6 relative"
                style={{ color: primaryColor }}
              >
                <div 
                  className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}
                >
                  <MessageCircle className="h-10 w-10 text-white" />
                </div>
                <div 
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: config.isOnline ? '#22c55e' : '#9ca3af' }}
                >
                  {config.isOnline ? (
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                {config.settings.welcomeMessage || 'Hey there!'}
              </h2>
              <p className="text-gray-500 text-sm mb-8 text-center max-w-xs leading-relaxed">
                {config.isOnline 
                  ? 'We typically reply within minutes. Ask us anything!'
                  : config.settings.offlineMessage || 'Leave a message and we\'ll get back to you soon.'}
              </p>
              
              {/* Input fields with modern styling */}
              <div className="w-full max-w-xs space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                    style={{ '--tw-ring-color': primaryColor + '50' } as React.CSSProperties}
                  />
                </div>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                    style={{ '--tw-ring-color': primaryColor + '50' } as React.CSSProperties}
                  />
                </div>
                <button 
                  onClick={handleStartChat}
                  className="w-full py-3.5 rounded-xl text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  }}
                >
                  Start conversation
                </button>
              </div>
            </div>

            {/* Quick topics */}
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-400 text-center mb-3">Popular topics</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickReplies.slice(0, 3).map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => { handleStartChat(); setTimeout(() => handleQuickReply(reply), 100) }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105"
                    style={{ 
                      borderColor: primaryMedium, 
                      color: primaryColor,
                      backgroundColor: primaryLight,
                    }}
                  >
                    {reply.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat View */
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <div 
                      className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-3"
                      style={{ backgroundColor: primaryLight }}
                    >
                      <MessageCircle className="h-6 w-6" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-gray-500 text-sm">
                      {config.settings.welcomeMessage || 'Send a message to start chatting!'}
                    </p>
                  </div>
                )}

                {messages.map((msg, index) => {
                  const isVisitor = msg.sender_type === 'visitor'
                  const isAI = msg.sender_type === 'ai'
                  const isSystem = msg.sender_type === 'system'
                  const showAvatar = index === 0 || messages[index - 1]?.sender_type !== msg.sender_type

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2',
                        isVisitor ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {showAvatar && !isVisitor && (
                        <div 
                          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-medium shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {isAI ? <Bot className="h-4 w-4" /> : config.name.charAt(0)}
                        </div>
                      )}
                      {!showAvatar && !isVisitor && <div className="w-8 shrink-0" />}
                      
                      <div
                        className={cn(
                          'max-w-[75%] px-4 py-2.5 shadow-sm',
                          isVisitor 
                            ? 'rounded-2xl rounded-br-md text-white' 
                            : 'rounded-2xl rounded-bl-md bg-white border border-gray-100'
                        )}
                        style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                      >
                        {isAI && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3 w-3" style={{ color: primaryColor }} />
                            <span className="text-[10px] font-medium" style={{ color: primaryColor }}>AI Assistant</span>
                          </div>
                        )}
                        <p className={cn(
                          'text-sm leading-relaxed whitespace-pre-wrap',
                          isVisitor ? 'text-white' : 'text-gray-700'
                        )}>
                          {msg.content}
                        </p>
                        <p className={cn(
                          'text-[10px] mt-1',
                          isVisitor ? 'text-white/60' : 'text-gray-400'
                        )}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {showAvatar && isVisitor && (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      {!showAvatar && isVisitor && <div className="w-8 shrink-0" />}
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-2">
                    <div 
                      className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick replies */}
            {showQuickReplies && messages.length === 0 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-400 mb-2">Quick questions</p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleQuickReply(reply)}
                      disabled={isSending}
                      className="px-3 py-2 rounded-xl text-xs font-medium border transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        borderColor: primaryMedium, 
                        color: primaryColor,
                        backgroundColor: primaryLight,
                      }}
                    >
                      {reply.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Handoff banner */}
            {handoffRequested && (
              <div 
                className="mx-4 mb-2 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                style={{ backgroundColor: primaryLight }}
              >
                <div className="relative">
                  <UserRound className="h-4 w-4" style={{ color: primaryColor }} />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                <span style={{ color: primaryColor }}>Connecting you to a human agent...</span>
              </div>
            )}

            {/* Talk to human button */}
            {!handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleRequestHuman}
                  disabled={isRequestingHandoff}
                  className="w-full py-2 rounded-xl text-xs font-medium border transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ 
                    borderColor: primaryMedium, 
                    color: primaryColor,
                    backgroundColor: 'white',
                  }}
                >
                  {isRequestingHandoff ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <UserRound className="h-3 w-3" /> Talk to a human
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSending}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:bg-white focus:border-transparent transition-all disabled:opacity-50"
                    style={{ '--tw-ring-color': primaryColor + '50' } as React.CSSProperties}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSending || !inputValue.trim()}
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
                  style={{ 
                    background: inputValue.trim() 
                      ? `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`
                      : '#d1d5db',
                  }}
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Branding footer */}
      {config.settings.showBranding && (
        <div className="py-2 text-center bg-white border-t border-gray-100">
          <a 
            href="https://vintrachat.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-gray-400 hover:text-gray-500 transition-colors"
          >
            Powered by <span className="font-medium">VintraChat</span>
          </a>
        </div>
      )}
    </div>
  )
}
