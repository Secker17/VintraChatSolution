'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { 
  Send, X, Bot, User, Loader2, UserRound, Sparkles, MessageCircle, 
  Home, Search, Clock, ChevronRight, HelpCircle, FileText, ArrowLeft,
  ThumbsUp, ThumbsDown, Smile, MoreHorizontal, Paperclip, Image as ImageIcon, AlertCircle
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
  const [aiEnabled, setAiEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vintrachat_ai_enabled')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })
  const [pendingAiMessageId, setPendingAiMessageId] = useState<string | null>(null)
  
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
      
      // Load messages from localStorage for this conversation
      const savedMessages = localStorage.getItem(`vintrachat_messages_${savedConvId}`)
      if (savedMessages) {
        try {
          let parsed = JSON.parse(savedMessages)
          if (Array.isArray(parsed)) {
            // Check AI enabled status from localStorage
            const savedAiEnabled = localStorage.getItem('vintrachat_ai_enabled')
            const aiIsEnabled = savedAiEnabled !== null ? savedAiEnabled === 'true' : true
            
            // Filter out AI messages if AI is disabled
            if (!aiIsEnabled) {
              parsed = parsed.filter((msg: ChatMessage) => msg.sender_type !== 'ai')
            }
            
            setMessages(parsed)
          }
        } catch (e) {
          console.error('Failed to load saved messages:', e)
        }
      }
    }
  }, [isPreview])

  useEffect(() => {
    if (isPreview || !conversationId) return
    
    // Set up realtime subscription for new messages
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`widget-messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage
            
            // Skip AI messages if AI is disabled
            if (newMsg.sender_type === 'ai' && !aiEnabled) {
              return
            }
            
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        )
        .subscribe()
      
      // Fetch existing messages immediately after subscribing
      setTimeout(() => fetchMessages(), 100)

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error('Failed to setup realtime subscription:', error)
      // Fallback: fetch messages if realtime subscription fails
      fetchMessages()
    }
  }, [conversationId, isPreview, aiEnabled])

  useEffect(() => {
    if (isPreview || !conversationId) return
    
    // Fallback polling every 2 seconds if realtime subscription fails
    const interval = setInterval(fetchMessages, 2000)
    
    return () => {
      clearInterval(interval)
    }
  }, [conversationId, isPreview])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem('vintrachat_ai_enabled', String(aiEnabled))
    
    // If AI is disabled, remove all AI messages from the chat
    if (!aiEnabled) {
      setMessages(prev => prev.filter(m => m.sender_type !== 'ai'))
    }
  }, [aiEnabled])

  // Save messages to localStorage for persistence across page reloads
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      localStorage.setItem(`vintrachat_messages_${conversationId}`, JSON.stringify(messages))
    }
  }, [messages, conversationId])

  async function fetchMessages() {
    if (!conversationId || isPreview) return
    try {
      const res = await fetch(`/api/widget/messages?conversationId=${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        const serverMessages = data.messages || []
        
        setMessages(prev => {
          // Create a map of existing message IDs to avoid duplicates
          const existingIds = new Set(prev.map(m => m.id))
          
          // Filter out any AI-generated messages if AI is disabled
          const filteredServer = serverMessages.filter((msg: ChatMessage) => {
            // If message is from AI and AI is disabled, skip it
            if (msg.sender_type === 'ai' && !aiEnabled) {
              return false
            }
            return true
          })
          
          // Only add new messages from server that we don't already have
          const newMessages = filteredServer.filter((msg: ChatMessage) => !existingIds.has(msg.id))
          
          if (newMessages.length === 0) {
            return prev
          }
          
          // Merge and return combined messages
          const combined = [...prev, ...newMessages]
          return combined
        })
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
        if (aiEnabled) {
          const mockResponse: ChatMessage = {
            id: 'mock_' + Date.now(),
            sender_type: 'ai',
            content: 'Thanks for your message! This is a preview response.',
            created_at: new Date().toISOString(),
          }
          setMessages(prev => [...prev, mockResponse])
        }
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
          // Don't filter out the user message - keep it and update its ID from temp to server ID
          const updated = prev.map(m => 
            m.id === visitorMsg.id 
              ? { ...m, id: data.messageId || data.message?.id || m.id }
              : m
          )
          // Only add AI response if AI is enabled
          if (data.aiResponse && aiEnabled) {
            updated.push(data.aiResponse)
            setPendingAiMessageId(data.aiResponse.id)
          }
          return updated
        })
        
        // Immediately fetch messages to get any admin responses
        setTimeout(() => fetchMessages(), 500)
      } else {
        console.error('Message send failed:', res.status)
        // Keep the message if it's just a temporary issue
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Don't remove the message - let it stay so user knows it was sent
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
      "flex h-full flex-col bg-white/80 backdrop-blur-xl overflow-hidden rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20",
      className
    )}>
      {/* Premium Header */}
      <div 
        className="shrink-0 px-6 py-6 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        }}
      >
        {/* Animated background elements with more contrast and better placement */}
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            x: [0, 20, 0],
            y: [0, -10, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-10 w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, -30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -left-10 w-48 h-48 bg-black/20 rounded-full blur-[60px] pointer-events-none" 
        />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1 
              }}
            >
              {config.settings.bubbleIcon === 'glassOrb' ? (
                <div className="relative">
                  <GlassOrbAvatar
                    glyph={config.settings.glassOrbGlyph || 'V'}
                    glyphFont="Times New Roman"
                    size={48}
                    variant="chatHeader"
                    interactive={false}
                    forceState="idle"
                    className="rounded-full shadow-2xl ring-4 ring-white/10"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -inset-1 bg-white/20 blur-md rounded-full -z-10"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white font-bold text-xl shadow-2xl">
                  {config.name.charAt(0).toUpperCase()}
                </div>
              )}
            </motion.div>
            <div className="text-white flex flex-col gap-0.5">
              <motion.h2 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-bold text-lg tracking-tight leading-none drop-shadow-sm"
              >
                {config.name}
              </motion.h2>
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 mt-1"
              >
                <div className="relative flex items-center justify-center">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    config.isOnline ? "bg-emerald-400" : "bg-white/40"
                  )} />
                  {config.isOnline && (
                    <span className="absolute h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </div>
                <span className="text-xs font-medium text-white/90">
                  {config.isOnline ? 'Active now' : 'Away'}
                </span>
              </motion.div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setAiEnabled(!aiEnabled)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 text-white shadow-sm border border-white/10 group"
              title={aiEnabled ? "Disable AI" : "Enable AI"}
            >
              {aiEnabled ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </button>
            <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 text-white shadow-sm border border-white/10">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <button 
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 text-white shadow-sm border border-white/10 group"
            >
              <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
        <AnimatePresence mode="wait">
          {/* FAQ Detail View */}
          {selectedFaq ? (
            <motion.div 
              key="faq-detail"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="p-6 bg-white/40 backdrop-blur-md border-b border-slate-200/50">
                <button
                  onClick={() => setSelectedFaq(null)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors group"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Back to Help Center
                </button>
                <h3 className="font-bold text-slate-900 text-xl tracking-tight">{selectedFaq.question}</h3>
              </div>
              <div className="flex-1 overflow-auto p-6 space-y-8">
                <div className="prose prose-slate prose-sm max-w-none">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-base">
                    {selectedFaq.answer}
                  </p>
                </div>
                
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-white rounded-3xl border border-slate-200/50 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900 mb-4">Was this helpful?</p>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600">
                      <ThumbsUp className="h-4 w-4" /> Yes
                    </button>
                    <button className="flex-1 py-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
                      <ThumbsDown className="h-4 w-4" /> No
                    </button>
                  </div>
                </motion.div>

                <button
                  onClick={() => {
                    setSelectedFaq(null)
                    setActiveTab('chat')
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  Still need help? Chat with us
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'home' ? (
            /* Home Tab - Premium Hub */
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-auto custom-scrollbar"
            >
              <div className="p-6 space-y-6">
                {/* Welcome Card */}
                <div className="relative overflow-hidden rounded-[2rem] p-8 text-center bg-white border border-slate-200/50 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-20" />
                  <motion.div 
                    animate={{ 
                      y: [0, -5, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center shadow-inner" 
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                    <Smile className="w-10 h-10" style={{ color: primaryColor }} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">How can we help?</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-[200px] mx-auto">
                    Search our knowledge base or start a fresh conversation.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* New Conversation Button */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('chat')}
                    className="w-full bg-white rounded-[1.5rem] p-5 border border-slate-200/50 hover:border-slate-300 hover:shadow-xl transition-all duration-300 text-left relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div 
                          className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all"
                          style={{ backgroundColor: `${primaryColor}15` }}
                        >
                          <MessageCircle className="h-6 w-6" style={{ color: primaryColor }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">Send us a message</h3>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mt-0.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{responseTimeText}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                    </div>
                  </motion.button>

                  {/* Help Center Section */}
                  {helpCenterEnabled && (
                    <div className="bg-white rounded-[2rem] border border-slate-200/50 overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm tracking-tight">
                          <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                          {helpCenterTitle}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Support
                        </span>
                      </div>
                      
                      <div className="p-4 bg-slate-50/30">
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            placeholder="Search for articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-12 bg-white border-slate-200 rounded-2xl text-sm placeholder:text-slate-400 focus-visible:ring-blue-500/20 transition-all shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="max-h-[240px] overflow-auto divide-y divide-slate-100 custom-scrollbar">
                        {filteredFaqs.length > 0 ? (
                          filteredFaqs.slice(0, 5).map((faq, idx) => (
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              key={faq.id}
                              onClick={() => setSelectedFaq(faq)}
                              className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 line-clamp-1 transition-colors">{faq.question}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0" />
                            </motion.button>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-400">No articles found matching "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Popular Topics */}
                  {quickReplies.length > 0 && (
                    <div className="px-2 space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Popular Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.slice(0, 4).map((reply, idx) => (
                          <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4 + (idx * 0.1) }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={reply.id}
                            onClick={() => {
                              setInputValue(reply.text)
                              setActiveTab('chat')
                            }}
                            className="px-4 py-2.5 text-xs font-bold rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200"
                            style={{ color: primaryColor }}
                          >
                            {reply.text}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Chat Tab - Enhanced Messaging */
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0 bg-slate-50/50"
            >
              <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6 pt-4"
                  >
                    {!conversationId && (
                      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-slate-200/50 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            <UserRound className="h-4 w-4 text-blue-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-900">
                            Introduce yourself
                          </p>
                        </div>
                        <div className="space-y-3">
                          <Input
                            placeholder="Full name"
                            value={visitorName}
                            onChange={(e) => setVisitorName(e.target.value)}
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm focus-visible:ring-blue-500/20"
                          />
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={visitorEmail}
                            onChange={(e) => setVisitorEmail(e.target.value)}
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm focus-visible:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    )}

                    <div 
                      className="rounded-[2rem] p-6 border relative overflow-hidden group shadow-sm bg-white"
                      style={{ borderColor: `${primaryColor}20` }}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Sparkles className="h-12 w-12" style={{ color: primaryColor }} />
                      </div>
                      <div className="flex items-start gap-4 relative z-10">
                        <div 
                          className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-2">
                            AI Assistant
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-500 border border-blue-100 uppercase tracking-tighter">AI</span>
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {config.settings.welcomeMessage || 'Hi there! I\'m your virtual assistant. How can I help you today?'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {messages.map((msg, idx) => {
                    const isVisitor = msg.sender_type === 'visitor'
                    const isAI = msg.sender_type === 'ai'
                    const isConsecutive = idx > 0 && messages[idx - 1].sender_type === msg.sender_type
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={msg.id}
                        className={cn(
                          'flex gap-3 group',
                          isVisitor && 'flex-row-reverse'
                        )}
                      >
                        {!isConsecutive && (
                          <div 
                            className={cn(
                              "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-sm transition-transform group-hover:scale-110",
                              isVisitor ? "bg-white text-slate-400 border border-slate-100" : "text-white"
                            )}
                            style={!isVisitor ? { backgroundColor: primaryColor } : undefined}
                          >
                            {isVisitor ? <User className="h-3.5 w-3.5" /> : isAI ? <Bot className="h-3.5 w-3.5" /> : 'A'}
                          </div>
                        )}
                        {isConsecutive && <div className="w-8 shrink-0" />}
                        <div className={cn("max-w-[85%]", isVisitor && "text-right")}>
                          <div
                            className={cn(
                              'relative px-3 py-2.5 text-[14px] leading-relaxed shadow-sm',
                              isVisitor 
                                ? 'bg-blue-600 text-white rounded-xl rounded-tr-none' 
                                : 'bg-white border border-slate-200/60 text-slate-800 rounded-xl rounded-tl-none'
                            )}
                            style={isVisitor ? { backgroundColor: primaryColor } : undefined}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <motion.p 
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            className={cn(
                              "text-[10px] font-bold mt-1.5 text-slate-400 uppercase tracking-wider",
                              isVisitor && "text-right"
                            )}
                          >
                            {time}
                          </motion.p>
                        </div>
                      </motion.div>
                    )
                  })}

                  {isTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div 
                        className="h-9 w-9 rounded-2xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-[1.25rem] rounded-tl-none px-4 py-4 shadow-sm">
                        <div className="flex gap-1.5">
                          {[0, 150, 300].map((delay) => (
                            <motion.span 
                              key={delay}
                              animate={{ 
                                scale: [1, 1.3, 1],
                                opacity: [0.4, 1, 0.4]
                              }}
                              transition={{ 
                                duration: 1, 
                                repeat: Infinity, 
                                delay: delay / 1000 
                              }}
                              className="w-1.5 h-1.5 rounded-full bg-slate-300" 
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/50">
                <div className="flex flex-col gap-3">
                  {!isPreview && !handoffRequested && conversationId && messages.some(m => m.sender_type === 'ai') && aiEnabled && (
                    <motion.button
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={handleRequestHuman}
                      disabled={isRequestingHandoff}
                      className="w-full text-[11px] font-bold py-2.5 px-4 rounded-xl border border-blue-100 bg-blue-50/30 text-blue-600 transition-all uppercase tracking-wider flex items-center justify-center gap-2 group"
                    >
                      {isRequestingHandoff ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 
                          Connecting to agent...
                        </>
                      ) : (
                        <>
                          <UserRound className="h-3.5 w-3.5 transition-transform group-hover:scale-110" /> 
                          Talk to a real person
                        </>
                      )}
                    </motion.button>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 group">
                    <div className="flex-1 relative flex items-center">
                      <div className="absolute left-2.5 flex items-center gap-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <button type="button" className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                          <Paperclip className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={1}
                        placeholder="Type your message..."
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(e)
                          }
                        }}
                        disabled={isSending}
                        className="w-full bg-white border border-slate-200/60 rounded-xl pl-3 focus-within:pl-10 pr-3 py-3 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none custom-scrollbar min-h-[44px] max-h-[120px]"
                      />
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit" 
                      disabled={isSending || !inputValue.trim()}
                      className="rounded-xl h-[44px] w-[44px] shrink-0 flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50 disabled:grayscale"
                      style={{ 
                        backgroundColor: primaryColor,
                        boxShadow: `0 6px 16px ${primaryColor}40`
                      }}
                    >
                      {isSending ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <Send className="h-4.5 w-4.5 -mr-0.5 mt-0.5" />
                      )}
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Bottom Navigation */}
      <div className="shrink-0 flex bg-white/90 backdrop-blur-md border-t border-slate-100/50 p-1.5 gap-1">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'chat', label: 'Chat', icon: MessageCircle }
        ].map((tab) => {
          const isActive = activeTab === tab.id && !selectedFaq
          const Icon = tab.icon
          
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedFaq(null)
                setActiveTab(tab.id as any)
              }}
              className={cn(
                "flex-1 py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 relative group",
                isActive ? "bg-slate-50 shadow-inner" : "hover:bg-slate-50/50"
              )}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-4.5 w-4.5 transition-all duration-300",
                    isActive ? "scale-110" : "text-slate-400 group-hover:text-slate-600"
                  )} 
                  style={isActive ? { color: primaryColor } : undefined} 
                />
                {isActive && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute -inset-2 bg-current opacity-10 blur-lg rounded-full"
                    style={{ color: primaryColor }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest transition-all",
                isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>
          )
        })}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}

export { ChatWidget as default }
