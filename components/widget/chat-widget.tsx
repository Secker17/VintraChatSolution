'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

// Mock FAQ data - in production this would come from the backend
const FAQ_ITEMS = [
  { id: '1', question: 'How do I get started?', answer: 'Getting started is easy! Simply sign up for an account and follow our quick setup guide.' },
  { id: '2', question: 'What are the pricing plans?', answer: 'We offer Free, Pro, and Enterprise plans. Visit our pricing page for details.' },
  { id: '3', question: 'How can I contact support?', answer: 'You can reach us via this chat, email at support@vintra.io, or through our help center.' },
  { id: '4', question: 'Is there a free trial?', answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required.' },
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
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  
  // New states for tawk.to-like features
  const [activeTab, setActiveTab] = useState<'home' | 'chat'>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFaq, setSelectedFaq] = useState<typeof FAQ_ITEMS[0] | null>(null)
  const [messageRatings, setMessageRatings] = useState<Record<string, 'up' | 'down'>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  const quickReplies = config.settings.quickReplies || []
  const primaryColor = config.settings.primaryColor || '#6366f1'

  // Filter FAQs based on search
  const filteredFaqs = FAQ_ITEMS.filter(faq => 
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

  function handleStartConversation() {
    setActiveTab('chat')
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

  function handleRateMessage(msgId: string, rating: 'up' | 'down') {
    setMessageRatings(prev => ({ ...prev, [msgId]: rating }))
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-white dark:bg-slate-950 overflow-hidden rounded-2xl shadow-2xl",
      className
    )}>
      {/* Header */}
      <div 
        className="shrink-0 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/10" />
        
        {/* Header content */}
        <div className="relative px-4 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {config.settings.bubbleIcon === 'glassOrb' ? (
                <GlassOrbAvatar
                  glyph={config.settings.glassOrbGlyph || 'V'}
                  glyphFont="Times New Roman"
                  size={48}
                  variant="chatHeader"
                  interactive={false}
                  forceState="idle"
                  className="rounded-full ring-2 ring-white/30 shadow-lg"
                />
              ) : (
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold bg-white/20 ring-2 ring-white/30 shadow-lg">
                  {config.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button 
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold mb-1">Welcome to {config.name}</h2>
          <p className="text-sm text-white/80">
            {config.isOnline ? "We're here to help 24x7." : "Leave us a message."}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
        {activeTab === 'home' ? (
          /* Home Tab - tawk.to style */
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-3">
              {/* New Conversation Card */}
              <button
                onClick={handleStartConversation}
                className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">New Conversation</h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>We typically reply in a few minutes</span>
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

              {/* Help Center Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                    Help Center
                  </h3>
                </div>
                
                {/* Search */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search for answers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-0 rounded-lg"
                    />
                  </div>
                </div>

                {/* FAQ List */}
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredFaqs.slice(0, 4).map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => setSelectedFaq(faq)}
                      className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{faq.question}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              {quickReplies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                    Popular Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.slice(0, 4).map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => {
                          handleQuickReply(reply.text)
                          setActiveTab('chat')
                        }}
                        className="px-3 py-2 text-sm font-medium rounded-full border bg-white dark:bg-slate-800 transition-all hover:shadow-sm"
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
        ) : selectedFaq ? (
          /* FAQ Detail View */
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <button
                onClick={() => setSelectedFaq(null)}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-3"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Help Center
              </button>
              <h3 className="font-semibold text-slate-900 dark:text-white">{selectedFaq.question}</h3>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedFaq.answer}</p>
              
              <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Was this helpful?</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm">
                    <ThumbsUp className="h-4 w-4" /> Yes
                  </button>
                  <button className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm">
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
                Still need help? Start a conversation
              </button>
            </div>
          </div>
        ) : (
          /* Chat Tab */
          <>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Welcome card when no messages */}
                {messages.length === 0 && (
                  <div className="space-y-4">
                    {/* Visitor Info Form */}
                    {!conversationId && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Before we start, tell us about yourself (optional)
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

                    {/* AI Welcome */}
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
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">Suggested</p>
                        <div className="flex flex-wrap gap-2">
                          {quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              onClick={() => handleQuickReply(reply.text)}
                              className="px-3 py-2 text-sm font-medium rounded-lg border bg-white dark:bg-slate-800 transition-all hover:shadow-sm"
                              style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
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
                    <div key={msg.id}>
                      <div
                        className={cn(
                          'flex gap-2',
                          isVisitor && 'flex-row-reverse',
                          isConsecutive ? 'mt-1' : 'mt-3'
                        )}
                      >
                        {!isConsecutive && (
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
                            isVisitor ? "bg-slate-200 dark:bg-slate-700" : "text-white"
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
                          
                          {/* Message rating for AI messages */}
                          {isAI && !isConsecutive && (
                            <div className="flex items-center gap-2 mt-1.5 pl-1">
                              <span className="text-[10px] text-slate-400">{time}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleRateMessage(msg.id, 'up')}
                                  className={cn(
                                    "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                                    messageRatings[msg.id] === 'up' && "text-green-500"
                                  )}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleRateMessage(msg.id, 'down')}
                                  className={cn(
                                    "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                                    messageRatings[msg.id] === 'down' && "text-red-500"
                                  )}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {!isAI && !isConsecutive && (
                            <p className={cn(
                              "text-[10px] mt-1 text-slate-400",
                              isVisitor ? "text-right pr-1" : "pl-1"
                            )}>
                              {time}
                            </p>
                          )}
                        </div>
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
                <Input
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSending}
                  className="flex-1 h-11 rounded-full px-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSending || !inputValue.trim()}
                  className="h-11 w-11 rounded-full shrink-0 transition-all hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation - tawk.to style */}
      {!selectedFaq && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="flex">
            <button
              onClick={() => setActiveTab('home')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-colors",
                activeTab === 'home' ? "text-slate-900 dark:text-white" : "text-slate-400"
              )}
            >
              <Home className="h-5 w-5" style={activeTab === 'home' ? { color: primaryColor } : undefined} />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative",
                activeTab === 'chat' ? "text-slate-900 dark:text-white" : "text-slate-400"
              )}
            >
              <MessageCircle className="h-5 w-5" style={activeTab === 'chat' ? { color: primaryColor } : undefined} />
              <span className="text-xs font-medium">Chat</span>
              {messages.length > 0 && (
                <span 
                  className="absolute top-2 right-1/4 h-2 w-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
