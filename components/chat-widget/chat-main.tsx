'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, Clock, HelpCircle, Search, ArrowLeft, ThumbsUp, ThumbsDown,
  Home, Bot, User, Loader2, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatMessage, FAQItem, WidgetSettings } from './types'

interface ChatMainProps {
  messages: ChatMessage[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  isSending?: boolean
  config: {
    name: string
    settings: WidgetSettings
    aiEnabled?: boolean
    isOnline?: boolean
  }
  className?: string
}

const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  { id: '1', question: 'How do I get started?', answer: 'Getting started is easy! Simply sign up for an account and follow our quick setup guide.' },
  { id: '2', question: 'What are the pricing plans?', answer: 'We offer Free, Pro, and Enterprise plans. Visit our pricing page for details.' },
  { id: '3', question: 'How can I contact support?', answer: 'You can reach us via this chat, email, or through our help center.' },
]

export function ChatMain({ 
  messages, 
  inputValue, 
  onInputChange, 
  onSend, 
  isSending = false,
  config,
  className 
}: ChatMainProps) {
  const [selectedFaq, setSelectedFaq] = useState<FAQItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'help'>('home')
  
  const { settings, aiEnabled = false, isOnline = false } = config
  const primaryColor = settings.primaryColor || '#0066FF'
  const responseTimeText = settings.responseTimeText || 'We typically reply in a few minutes'
  const helpCenterEnabled = settings.helpCenterEnabled ?? true
  const helpCenterTitle = settings.helpCenterTitle || 'Help Center'
  const quickReplies = settings.quickReplies || []
  const faqItems = settings.faqItems || DEFAULT_FAQ_ITEMS

  const filteredFaqs = faqItems.filter((faq: FAQItem) =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={cn(
      "flex-1 flex flex-col min-h-0 bg-slate-50/50",
      className
    )}>
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
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
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
              
              <div className="p-6 bg-white rounded-3xl border border-slate-200/50 shadow-sm">
                <p className="text-sm font-semibold text-slate-900 mb-4">Was this helpful?</p>
                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600">
                    <ThumbsUp className="h-4 w-4" /> Yes
                  </button>
                  <button className="flex-1 py-3 rounded-2xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-red-600">
                    <ThumbsDown className="h-4 w-4" /> No
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'help' ? (
          /* Help Center View */
          <motion.div
            key="help-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-auto custom-scrollbar"
          >
            <div className="p-6 space-y-6">
              <div className="bg-white rounded-4xl border border-slate-200/50 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm tracking-tight">
                    <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                    {helpCenterTitle}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {faqItems.length} articles
                  </span>
                </div>
                
                <div className="p-4 bg-slate-50/30">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Search for articles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white border-slate-200/50 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-auto divide-y divide-slate-100 custom-scrollbar">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq: FAQItem) => (
                      <button
                        key={faq.id}
                        onClick={() => setSelectedFaq(faq)}
                        className="w-full p-4 text-left hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                              {faq.question}
                            </h4>
                          </div>
                          <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-blue-500 rotate-180 transition-all" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No articles found matching your search.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'chat' ? (
          /* Chat View */
          <motion.div
            key="chat-view"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Start a conversation...</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      message.sender_type === 'visitor' ? "ml-auto" : "mr-auto"
                    )}
                  >
                    {message.sender_type !== 'visitor' && (
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        {message.sender_type === 'ai' ? (
                          <Bot className="h-4 w-4 text-slate-600" />
                        ) : (
                          <User className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm",
                        message.sender_type === 'visitor'
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-slate-200 text-slate-900"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          /* Home View */
          <motion.div
            key="home-view"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-auto custom-scrollbar"
          >
            <div className="p-6 space-y-6">
              {/* Welcome Card */}
              <div className="relative overflow-hidden rounded-4xl p-8 text-center bg-white border border-slate-200/50 shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-400 to-transparent opacity-20" />
                <motion.div 
                  animate={{ 
                    y: [0, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-4xl mb-4"
                >
                  👋
                </motion.div>
                <h2 className="font-bold text-slate-900 text-xl mb-2">
                  {aiEnabled ? 'AI Assistant Available' : 'Welcome to ' + config.name}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {aiEnabled 
                    ? 'I\'m here to help! Ask me anything or start a conversation with our team.'
                    : 'How can we help you today? Choose an option below to get started.'
                  }
                </p>
              </div>

              <div className="space-y-4">
                {/* New Conversation Button */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('chat')}
                  className="w-full bg-white rounded-3xl p-5 border border-slate-200/50 hover:border-slate-300 hover:shadow-xl transition-all duration-300 text-left relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-linear-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    <ArrowLeft className="h-4 w-4 text-slate-400 rotate-180 group-hover:text-blue-500 transition-colors" />
                  </div>
                </motion.button>

                {/* Help Center Section */}
                {helpCenterEnabled && (
                  <div className="bg-white rounded-4xl border border-slate-200/50 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm tracking-tight">
                        <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                        {helpCenterTitle}
                      </h3>
                      <button
                        onClick={() => setActiveTab('help')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View all
                      </button>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      {faqItems.slice(0, 3).map((faq: FAQItem) => (
                        <button
                          key={faq.id}
                          onClick={() => setSelectedFaq(faq)}
                          className="w-full p-3 text-left hover:bg-slate-50/50 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-slate-700 text-sm group-hover:text-blue-600 transition-colors">
                              {faq.question}
                            </h4>
                            <ArrowLeft className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 rotate-180 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Replies */}
                {quickReplies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm px-1">Quick Replies</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {quickReplies.map((reply: any) => (
                        <button
                          key={reply.id}
                          onClick={() => onInputChange(reply.text)}
                          className="p-3 bg-white border border-slate-200/50 hover:border-blue-200 hover:bg-blue-50 rounded-xl text-left transition-all duration-200 group"
                        >
                          <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                            {reply.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
