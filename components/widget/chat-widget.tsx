'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { 
  Send, X, Bot, User, Loader2, UserRound, Sparkles, MessageCircle, 
  Home, Search, Clock, ChevronRight, HelpCircle, FileText, ArrowLeft,
  ThumbsUp, ThumbsDown
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

  function handleClose() {
    if (onClose) {
      onClose()
    } else {
      window.parent.postMessage('vintrachat:close', '*')
    }
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-white overflow-hidden rounded-2xl shadow-2xl border border-gray-100",
      className
    )}>
      {/* Clean Header */}
      <div 
        className="shrink-0 px-5 py-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center justify-between">
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
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                {config.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-white">
              <h2 className="font-semibold text-base leading-tight">{config.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  config.isOnline ? "bg-green-400" : "bg-white/50"
                )} />
                <span className="text-xs text-white/80">
                  {config.isOnline ? 'Online' : 'Away'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        {/* FAQ Detail View */}
        {selectedFaq ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-white border-b">
              <button
                onClick={() => setSelectedFaq(null)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h3 className="font-semibold text-gray-900">{selectedFaq.question}</h3>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {selectedFaq.answer}
              </p>
              
              <div className="mt-6 p-4 bg-white rounded-xl border">
                <p className="text-sm text-gray-500 mb-3">Was this helpful?</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg border hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                    <ThumbsUp className="h-4 w-4" /> Yes
                  </button>
                  <button className="flex-1 py-2 rounded-lg border hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                    <ThumbsDown className="h-4 w-4" /> No
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedFaq(null)
                  setActiveTab('chat')
                }}
                className="w-full mt-4 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Start a conversation
              </button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* Home Tab */
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {/* New Conversation Card */}
            <button
              onClick={() => setActiveTab('chat')}
              className="w-full bg-white rounded-xl p-4 border hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">New Conversation</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
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
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                    {helpCenterTitle}
                  </h3>
                </div>
                
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search for answers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-gray-50 border-0 rounded-lg"
                    />
                  </div>
                </div>

                <div className="divide-y">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.slice(0, 4).map((faq) => (
                      <button
                        key={faq.id}
                        onClick={() => setSelectedFaq(faq)}
                        className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 line-clamp-1">{faq.question}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No FAQs found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Topics */}
            {quickReplies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
                  Popular Topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.slice(0, 4).map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => {
                        setInputValue(reply.text)
                        setActiveTab('chat')
                      }}
                      className="px-3 py-2 text-sm font-medium rounded-full border bg-white transition-all hover:shadow-sm"
                      style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
                    >
                      {reply.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Chat Tab */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-4">
                  {!conversationId && (
                    <div className="bg-white rounded-xl p-4 border space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Tell us about yourself (optional)
                      </p>
                      <Input
                        placeholder="Your name"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                      <Input
                        type="email"
                        placeholder="Your email"
                        value={visitorEmail}
                        onChange={(e) => setVisitorEmail(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </div>
                  )}

                  <div 
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 mb-1">AI Assistant</p>
                        <p className="text-sm text-gray-600">
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
                      'flex gap-2',
                      isVisitor && 'flex-row-reverse',
                      isConsecutive && 'mt-1'
                    )}
                  >
                    {!isConsecutive && (
                      <div 
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
                          isVisitor ? "bg-gray-200 text-gray-600" : "text-white"
                        )}
                        style={!isVisitor ? { backgroundColor: primaryColor } : undefined}
                      >
                        {isVisitor ? <User className="h-3.5 w-3.5" /> : isAI ? <Bot className="h-3.5 w-3.5" /> : 'A'}
                      </div>
                    )}
                    {isConsecutive && <div className="w-7 shrink-0" />}
                    <div className={cn("max-w-[80%]", isVisitor && "text-right")}>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2.5',
                          isVisitor 
                            ? 'text-white rounded-br-md' 
                            : 'bg-white border rounded-bl-md'
                        )}
                        style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <p className={cn(
                        "text-[10px] mt-1 text-gray-400",
                        isVisitor && "text-right"
                      )}>
                        {time}
                      </p>
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className="flex gap-2">
                  <div 
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
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
            <div className="p-3 bg-white border-t">
              {!isPreview && !handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && (
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  disabled={isRequestingHandoff}
                  className="w-full text-xs py-2 px-3 rounded-lg border mb-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
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
                  className="flex-1 rounded-full px-4 h-10 border-gray-200"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSending || !inputValue.trim()}
                  className="rounded-full h-10 w-10 shrink-0"
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

      {/* Bottom Navigation */}
      <div className="shrink-0 flex border-t bg-white">
        <button
          onClick={() => {
            setSelectedFaq(null)
            setActiveTab('home')
          }}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors",
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
            "flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors",
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
