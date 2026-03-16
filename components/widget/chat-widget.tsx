'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { 
  Send, X, Bot, User, Loader2, UserRound, Sparkles, MessageCircle, 
  Home, Search, Clock, ChevronRight, HelpCircle, FileText, ArrowLeft,
  ThumbsUp, ThumbsDown, Smile
} from 'lucide-react'
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

const DEFAULT_FAQ_ITEMS = [
  { id: '1', question: 'How do I get started?', answer: 'Getting started is easy! Simply sign up for an account and follow our quick setup guide.' },
  { id: '2', question: 'What are the pricing plans?', answer: 'We offer Free, Pro, and Enterprise plans. Visit our pricing page for details.' },
  { id: '3', question: 'How can I contact support?', answer: 'You can reach us via this chat, email, or through our help center.' },
]

export function ChatWidget({ config, isPreview = false, onClose, className }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [isRequestingHandoff, setIsRequestingHandoff] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'chat'>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFaq, setSelectedFaq] = useState<{ id: string; question: string; answer: string } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  const quickReplies = config.settings.quickReplies || []
  const primaryColor = config.settings.primaryColor || '#3b82f6'
  const faqItems = config.settings.faqItems?.length ? config.settings.faqItems : DEFAULT_FAQ_ITEMS
  const helpCenterEnabled = config.settings.helpCenterEnabled ?? true
  const helpCenterTitle = config.settings.helpCenterTitle || 'Help Center'
  const responseTimeText = config.settings.responseTimeText || 'We typically reply in a few minutes'

  const filteredFaqs = faqItems.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      setActiveTab('chat')
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
          content: 'Thanks for your message! This is a preview response.',
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
          const serverMessage = data.message || { ...visitorMsg, id: data.messageId || visitorMsg.id }
          const newMessages = [...filtered, serverMessage]
          if (data.aiResponse) {
            newMessages.push(data.aiResponse)
          }
          return newMessages
        })
      } else {
        console.error('Message send failed:', res.status)
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

  function handleClose() {
    if (onClose) {
      onClose()
    } else {
      window.parent.postMessage('vintrachat:close', '*')
    }
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-white overflow-hidden rounded-3xl shadow-2xl",
      className
    )}>
      {/* Minimalist Header */}
      <div 
        className="shrink-0 px-6 py-5 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            {config.settings.bubbleIcon === 'glassOrb' ? (
              <GlassOrbAvatar
                glyph={config.settings.glassOrbGlyph || 'V'}
                glyphFont="Times New Roman"
                size={40}
                variant="chatHeader"
                interactive={false}
                forceState="idle"
                className="rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-semibold text-sm">
                {config.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-white">
              <h2 className="font-semibold text-base leading-tight">{config.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  config.isOnline ? "bg-emerald-300 animate-pulse" : "bg-white/50"
                )} />
                <span className="text-xs text-white/80">
                  {config.isOnline ? 'Online' : 'Away'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 text-white hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white via-white to-gray-50">
        {/* FAQ Detail View */}
        {selectedFaq ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 bg-white border-b">
              <button
                onClick={() => setSelectedFaq(null)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h3 className="font-semibold text-gray-900 text-lg">{selectedFaq.question}</h3>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {selectedFaq.answer}
              </p>
              
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                <p className="text-sm text-gray-600 mb-3 font-medium">Was this helpful?</p>
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl border border-blue-200 hover:bg-blue-100 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium text-blue-600">
                    <ThumbsUp className="h-4 w-4" /> Yes
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium text-gray-600">
                    <ThumbsDown className="h-4 w-4" /> No
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedFaq(null)
                  setActiveTab('chat')
                }}
                className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                Still need help? Start a conversation
              </button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* Home Tab - Minimalist Welcome */
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6 flex flex-col h-full">
              {/* Welcome Section */}
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                  <Smile className="w-8 h-8" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    How can we help you today?
                  </p>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {/* New Conversation */}
                <button
                  onClick={() => setActiveTab('chat')}
                  className="w-full bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Start Chat</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{responseTimeText}</span>
                      </div>
                    </div>
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <Send className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                  </div>
                </button>

                {/* Help Center */}
                {helpCenterEnabled && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                        <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                        {helpCenterTitle}
                      </h3>
                    </div>
                    
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-9 bg-gray-50 border-0 rounded-lg text-sm placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="max-h-[200px] overflow-auto divide-y divide-gray-100">
                      {filteredFaqs.length > 0 ? (
                        filteredFaqs.slice(0, 5).map((faq) => (
                          <button
                            key={faq.id}
                            onClick={() => setSelectedFaq(faq)}
                            className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-700 line-clamp-1">{faq.question}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-500">
                          No results found
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Topics */}
                {quickReplies.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Popular</p>
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.slice(0, 4).map((reply) => (
                        <button
                          key={reply.id}
                          onClick={() => {
                            setInputValue(reply.text)
                            setActiveTab('chat')
                          }}
                          className="px-3 py-2 text-xs font-medium rounded-full border bg-white transition-all duration-200 hover:shadow-sm hover:scale-105"
                          style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
                        >
                          {reply.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Tab */
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4 pt-8">
                  {!conversationId && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Your details (optional)
                      </p>
                      <Input
                        placeholder="Your name"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={visitorEmail}
                        onChange={(e) => setVisitorEmail(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  )}

                  <div 
                    className="rounded-2xl p-5 border"
                    style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 mb-1">AI Assistant</p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {config.settings.welcomeMessage || 'Hi! How can I help you today?'}
                        </p>
                      </div>
                    </div>
                  </div>
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
                      'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                      isVisitor && 'flex-row-reverse'
                    )}
                  >
                    {!isConsecutive && (
                      <div 
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
                          isVisitor ? "bg-gray-200 text-gray-700" : "text-white"
                        )}
                        style={!isVisitor ? { backgroundColor: primaryColor } : undefined}
                      >
                        {isVisitor ? <User className="h-4 w-4" /> : isAI ? <Bot className="h-4 w-4" /> : 'A'}
                      </div>
                    )}
                    {isConsecutive && <div className="w-8 shrink-0" />}
                    <div className={cn("max-w-[75%]", isVisitor && "text-right")}>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          isVisitor 
                            ? 'text-white rounded-br-none' 
                            : 'bg-white border border-gray-100 rounded-bl-none'
                        )}
                        style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className={cn(
                        "text-[11px] mt-1 text-gray-400",
                        isVisitor && "text-right"
                      )}>
                        {time}
                      </p>
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className="flex gap-3 animate-in fade-in duration-300">
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                    <div className="flex gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
              {!isPreview && !handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  disabled={isRequestingHandoff}
                  className="w-full text-xs py-2 px-3 rounded-lg border mb-3 transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
                  style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
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
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSending}
                  className="flex-1 rounded-full px-4 h-10 border-gray-200 text-sm placeholder:text-gray-400"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSending || !inputValue.trim()}
                  className="rounded-full h-10 w-10 shrink-0 transition-all duration-200 hover:shadow-lg hover:scale-105"
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
          </div>
        )}
      </div>

      {/* Bottom Navigation - Minimal */}
      <div className="shrink-0 flex border-t bg-white">
        <button
          onClick={() => {
            setSelectedFaq(null)
            setActiveTab('home')
          }}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-all duration-200",
            activeTab === 'home' && !selectedFaq ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Home className="h-5 w-5" style={activeTab === 'home' && !selectedFaq ? { color: primaryColor } : undefined} />
          Home
        </button>
        <button
          onClick={() => {
            setSelectedFaq(null)
            setActiveTab('chat')
          }}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-all duration-200",
            activeTab === 'chat' && !selectedFaq ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <MessageCircle className="h-5 w-5" style={activeTab === 'chat' && !selectedFaq ? { color: primaryColor } : undefined} />
          Chat
        </button>
      </div>
    </div>
  )
}

export { ChatWidget as default }
