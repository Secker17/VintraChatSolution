'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, Clock, HelpCircle, Search, ArrowLeft, ThumbsUp, ThumbsDown,
  Home, Bot, User, Loader2, Sparkles
} from 'lucide-react'
import { ChatMessage, FAQItem, WidgetSettings } from './types'
import styles from './styles/chat-main.module.css'

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
  const showTimestamps = settings.showTimestamps ?? true
  const allowFileUpload = settings.allowFileUpload ?? true
  const allowEmoji = settings.allowEmoji ?? true
  const autoScroll = settings.autoScroll ?? true
  const customTheme = settings.customTheme || 'auto'
  const fontFamily = settings.fontFamily || 'system-ui'

  const filteredFaqs = faqItems.filter((faq: FAQItem) =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={`${styles.mainContainer} ${className || ''}`}>
      <AnimatePresence mode="wait">
        {/* FAQ Detail View */}
        {selectedFaq ? (
          <motion.div
            key="faq-detail"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className={styles.faqDetailView}
          >
            <div className={styles.faqDetailHeader}>
              <button
                onClick={() => setSelectedFaq(null)}
                className={styles.backButton}
              >
                <ArrowLeft className={`${styles.backButtonArrow} h-4 w-4`} />
                Back to Help Center
              </button>
              <h3 className={styles.faqDetailTitle}>{selectedFaq.question}</h3>
            </div>
            <div className={styles.faqDetailContent}>
              <div className="prose prose-slate prose-sm max-w-none">
                <p className={styles.faqDetailAnswer}>
                  {selectedFaq.answer}
                </p>
              </div>
              
              <div className={styles.helpfulSection}>
                <p className={styles.helpfulTitle}>Was this helpful?</p>
                <div className={styles.helpfulButtons}>
                  <button className={`${styles.helpfulButton} ${styles.helpfulButtonYes}`}>
                    <ThumbsUp className="styles.helpfulIcon" /> Yes
                  </button>
                  <button className={`${styles.helpfulButton} ${styles.helpfulButtonNo}`}>
                    <ThumbsDown className="styles.helpfulIcon" /> No
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'help' ? (
          /* Help Center View */
          <motion.div
            key="help"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`${styles.faqView} ${styles.customScrollbar}`}
          >
            <div className={styles.faqViewContent}>
              <div className={styles.faqViewContainer}>
                <div className={styles.faqViewHeader}>
                  <h3 className={styles.faqViewTitle}>
                    <HelpCircle className="h-4 w-4" style={{ color: primaryColor }} />
                    {helpCenterTitle}
                  </h3>
                  <span className={styles.faqViewCount}>
                    {faqItems.length} articles
                  </span>
                </div>
                
                <div className={styles.faqSearchContainer}>
                  <div className={styles.faqSearchWrapper}>
                    <Search className={styles.faqSearchIcon} />
                    <Input
                      placeholder="Search for articles..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className={styles.faqSearchInput}
                    />
                  </div>
                </div>

                <div className={`${styles.faqListContainer} ${styles.customScrollbar}`}>
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq: FAQItem) => (
                      <button
                        key={faq.id}
                        onClick={() => setSelectedFaq(faq)}
                        className={styles.faqListItem}
                      >
                        <div className={styles.faqListItemContent}>
                          <div className={styles.faqListItemTextContainer}>
                            <h4 className={styles.faqListItemQuestion}>
                              {faq.question}
                            </h4>
                          </div>
                          <ArrowLeft className={styles.faqListItemArrow} />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.faqEmptyState}>
                      <HelpCircle className={styles.faqEmptyIcon} />
                      <p className={styles.faqEmptyText}>No articles found matching your search.</p>
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
            className={styles.chatView}
          >
            <div className={`${styles.chatViewContent} ${styles.customScrollbar}`}>
              {messages.length === 0 ? (
                <div className={styles.chatEmptyState}>
                  <MessageCircle className={styles.chatEmptyIcon} />
                  <p className={styles.chatEmptyText}>Start a conversation...</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${
                      message.sender_type === 'visitor' ? styles.messageVisitor : styles.messageAgent
                    }`}
                  >
                    {message.sender_type !== 'visitor' && (
                      <div className={styles.messageAvatar}>
                        {message.sender_type === 'ai' ? (
                          <Bot className="styles.messageIcon" />
                        ) : (
                          <User className="styles.messageIcon" />
                        )}
                      </div>
                    )}
                    <div
                      className={`${styles.messageContent} ${
                        message.sender_type === 'visitor' ? styles.messageVisitorContent : styles.messageAgentContent
                      }`}
                    >
                      {message.content}
                    </div>
                    {showTimestamps && (
                      <div className={styles.timestamp}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </div>
                    )}
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
            className={`${styles.homeView} ${styles.customScrollbar}`}
          >
            <div className={styles.homeViewContent}>
              {/* Welcome Card */}
              <div className={styles.welcomeCardNew}>
                <div className={styles.welcomeCardGradient} />
                <motion.div 
                  animate={{ 
                    y: [0, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={styles.welcomeEmojiAnimated}
                >
                  👋
                </motion.div>
                <h2 className={styles.welcomeTitleNew}>
                  {aiEnabled ? 'AI Assistant Available' : 'Welcome to ' + config.name}
                </h2>
                <p className={styles.welcomeDescriptionNew}>
                  {aiEnabled 
                    ? 'I\'m here to help! Ask me anything or start a conversation with our team.'
                    : 'How can we help you today? Choose an option below to get started.'
                  }
                </p>
              </div>

              <div className={styles.actionButtons}>
                {/* New Conversation Button */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('chat')}
                  className={styles.newConversationButton}
                >
                  <div className={styles.newConversationButtonOverlay} />
                  <div className={styles.newConversationButtonContent}>
                    <div className={styles.newConversationButtonLeft}>
                      <div 
                        className={styles.newConversationButtonIcon}
                        style={{ backgroundColor: `${primaryColor}15` }}
                      >
                        <MessageCircle className="styles.messageIcon" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <h3 className={styles.newConversationButtonText}>Send us a message</h3>
                        <div className={styles.newConversationButtonSubtext}>
                          <Clock className="styles.clockIcon" />
                          <span>{responseTimeText}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className={styles.newConversationButtonArrow} />
                  </div>
                </motion.button>

                {/* Help Center Section */}
                {helpCenterEnabled && (
                  <div className={styles.helpCenterSection}>
                    <div className={styles.helpCenterHeader}>
                      <h3 className={styles.helpCenterTitle}>
                        <HelpCircle className="styles.helpIcon" style={{ color: primaryColor }} />
                        {helpCenterTitle}
                      </h3>
                      <button
                        onClick={() => setActiveTab('help')}
                        className={styles.viewAllButton}
                      >
                        View all
                      </button>
                    </div>
                    
                    <div className={styles.helpCenterFaqs}>
                      {faqItems.slice(0, 3).map((faq: FAQItem) => (
                        <button
                          key={faq.id}
                          onClick={() => setSelectedFaq(faq)}
                          className={styles.helpCenterFaqItem}
                        >
                          <div className={styles.helpCenterFaqContent}>
                            <h4 className={styles.helpCenterFaqQuestion}>
                              {faq.question}
                            </h4>
                            <ArrowLeft className={styles.helpCenterFaqArrow} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Replies */}
                {quickReplies.length > 0 && (
                  <div className={styles.quickRepliesSection}>
                    <h4 className={styles.quickRepliesTitle}>Quick Replies</h4>
                    <div className={styles.quickRepliesGrid}>
                      {quickReplies.map((reply: any) => (
                        <button
                          key={reply.id}
                          onClick={() => onInputChange(reply.text)}
                          className={styles.quickReplyButton}
                        >
                          <span className={styles.quickReplyButtonText}>
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
