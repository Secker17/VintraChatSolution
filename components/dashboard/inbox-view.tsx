'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Send, CheckCircle, Clock, User, Bot, UserRound, Loader2, MessageSquare, Inbox } from 'lucide-react'
import type { Organization, TeamMember, Conversation, Message, Visitor } from '@/lib/types'

interface ConversationWithDetails extends Conversation {
  visitor: Visitor
  messages: Message[]
}

interface InboxViewProps {
  initialConversations: ConversationWithDetails[]
  organization: Organization
  teamMember: TeamMember
  teamMembers: TeamMember[]
}

export function InboxView({ 
  initialConversations, 
  organization,
  teamMember,
  teamMembers 
}: InboxViewProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(
    initialConversations[0] || null
  )
  const [messages, setMessages] = useState<Message[]>(selectedConversation?.messages || [])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'pending'>('all')
  const [isTakingOver, setIsTakingOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Subscribe to realtime updates for new messages
  useEffect(() => {
    if (!selectedConversation?.id) return

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setMessages(selectedConversation.messages || [])
    }
  }, [selectedConversation])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      sender_id: teamMember.id,
      content: newMessage.trim(),
      read_at: null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')
    setIsSending(true)

    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_type: 'agent',
        sender_id: teamMember.id,
        content: optimisticMsg.content,
      }).select().single()

      if (error) throw error

      if (data) {
        setMessages(prev =>
          prev.map(msg => msg.id === optimisticMsg.id ? data : msg)
        )
      }

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id)
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id))
      setNewMessage(optimisticMsg.content)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (conversationId: string, status: 'open' | 'resolved' | 'pending') => {
    try {
      await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, status } : conv
        )
      )

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, status } : null)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true
    return conv.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500'
      case 'pending': return 'bg-amber-500'
      case 'resolved': return 'bg-muted-foreground'
      default: return 'bg-muted-foreground'
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Conversation List Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Inbox
          </h2>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter conversations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conversations</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Install the widget to start receiving messages from your visitors.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => {
                const lastMessage = conv.messages?.[conv.messages.length - 1]
                const visitorName = conv.visitor?.name || conv.visitor?.email || 'Anonymous Visitor'
                const initials = visitorName.charAt(0).toUpperCase()

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                      selectedConversation?.id === conv.id && 'bg-muted'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                          getStatusColor(conv.status)
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{visitorName}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMessage?.content || 'No messages'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="h-16 border-b bg-card px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {(selectedConversation.visitor?.name || selectedConversation.visitor?.email || 'A').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {selectedConversation.visitor?.name || selectedConversation.visitor?.email || 'Anonymous Visitor'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.visitor?.email || 'No email provided'}
                </p>
              </div>
            </div>
            <Select 
              value={selectedConversation.status} 
              onValueChange={(v) => handleStatusChange(selectedConversation.id, v as 'open' | 'resolved' | 'pending')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Open
                  </span>
                </SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                </SelectItem>
                <SelectItem value="resolved">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" /> Resolved
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No messages in this conversation yet.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAgent = msg.sender_type === 'agent'
                  const isAI = msg.sender_type === 'ai'
                  const isSystem = msg.sender_type === 'system'

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <Badge variant="secondary" className="text-xs">
                          {msg.content}
                        </Badge>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        (isAgent || isAI) && 'flex-row-reverse'
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={cn(
                          isAI && 'bg-primary text-primary-foreground',
                          isAgent && 'bg-primary text-primary-foreground'
                        )}>
                          {isAI ? <Bot className="h-4 w-4" /> : isAgent ? 'A' : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2 max-w-md',
                          (isAgent || isAI)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {isAI && (
                          <p className="text-xs opacity-70 mb-1">AI Assistant</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn(
                          'text-[10px] mt-1',
                          (isAgent || isAI) ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t bg-card p-4 shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSending}
                className="flex-1"
              />
              <Button type="submit" disabled={isSending || !newMessage.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/30">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a conversation from the list to view messages</p>
          </div>
        </div>
      )}
    </div>
  )
}
