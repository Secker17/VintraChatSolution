'use client'

// Dashboard inbox component for managing conversations
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
import { 
  Send, 
  CheckCircle, 
  Clock, 
  User, 
  Bot, 
  Loader2, 
  MessageSquare, 
  Inbox,
  Search,
  MoreHorizontal,
  ArrowLeft,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Organization, TeamMember, Conversation, Message, Visitor } from '@/lib/types'

interface ConversationWithDetails extends Conversation {
  visitor: Visitor
  messages: Message[]
}

interface DashboardInboxProps {
  initialConversations: ConversationWithDetails[]
  organization: Organization
  teamMember: TeamMember
  teamMembers: TeamMember[]
}

export function DashboardInbox({ 
  initialConversations, 
  organization,
  teamMember,
  teamMembers 
}: DashboardInboxProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Handle hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Subscribe to realtime updates for new conversations
  useEffect(() => {
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `organization_id=eq.${organization.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the full conversation with visitor details
            const { data } = await supabase
              .from('conversations')
              .select('*, visitor:visitors(*), messages(*)')
              .eq('id', payload.new.id)
              .single()
            
            if (data) {
              setConversations(prev => {
                if (prev.some(c => c.id === data.id)) return prev
                return [data as ConversationWithDetails, ...prev]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
            )
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message
          // Update the conversation's last message
          setConversations(prev =>
            prev.map(c => {
              if (c.id === newMsg.conversation_id) {
                return {
                  ...c,
                  last_message_at: newMsg.created_at,
                  messages: [...(c.messages || []), newMsg]
                }
              }
              return c
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization.id, supabase])

  // Subscribe to realtime updates for new messages in selected conversation
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
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id, supabase])

  // Fallback: Poll for new conversations every 3 seconds
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations')
        if (response.ok) {
          const data = await response.json()
          if (data.conversations) {
            setConversations(data.conversations)
            // Also update messages for the selected conversation
            if (selectedConversation) {
              const updated = data.conversations.find((c: ConversationWithDetails) => c.id === selectedConversation.id)
              if (updated && updated.messages) {
                setMessages(updated.messages)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      }
    }

    // Initial fetch
    fetchConversations()
    
    const interval = setInterval(fetchConversations, 3000)
    return () => clearInterval(interval)
  }, [selectedConversation])

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

  const handleSelectConversation = (conv: ConversationWithDetails) => {
    setSelectedConversation(conv)
    setMessages(conv.messages || [])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    const messageContent = newMessage.trim()
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      sender_id: teamMember.id,
      content: messageContent,
      read_at: null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')
    setIsSending(true)

    try {
      // Use API endpoint to send message (bypasses RLS)
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          content: messageContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const { message: newMsg } = await response.json()
      
      if (newMsg) {
        setMessages(prev =>
          prev.map(msg => msg.id === optimisticMsg.id ? newMsg : msg)
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id))
      setNewMessage(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (conversationId: string, status: 'open' | 'resolved' | 'pending') => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Failed to update status')

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

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/conversations/${conversationToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete conversation')

      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete))
      
      // Clear selection if deleted conversation was selected
      if (selectedConversation?.id === conversationToDelete) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    }
  }

  const confirmDelete = (conversationId: string) => {
    setConversationToDelete(conversationId)
    setDeleteDialogOpen(true)
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesFilter = filter === 'all' || conv.status === filter
    const visitorName = conv.visitor?.name || conv.visitor?.email || ''
    const matchesSearch = searchQuery === '' || 
      visitorName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
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

  // Show loading skeleton during hydration
  if (!isMounted) {
    return (
      <div className="flex flex-1 bg-background">
        <div className="w-full md:w-80 lg:w-96 border-r bg-card flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-muted/50 mx-auto mb-4 animate-pulse" />
            <div className="h-5 w-40 bg-muted animate-pulse rounded mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 bg-background">
      {/* Conversation List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r bg-card flex flex-col",
        selectedConversation && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbox
            </h2>
            <Badge variant="secondary">{filteredConversations.length}</Badge>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter */}
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conversations</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No conversations</p>
              <p className="text-sm mt-1">
                {conversations.length === 0 
                  ? "Install the widget to start receiving messages"
                  : "No conversations match your filter"}
              </p>
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
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                      selectedConversation?.id === conv.id && 'bg-muted'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                          getStatusColor(conv.status)
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate text-sm">{visitorName}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
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
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Chat Header */}
          <div className="h-16 border-b bg-card px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
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
            <div className="flex items-center gap-2">
              <Select 
                value={selectedConversation.status} 
                onValueChange={(v) => handleStatusChange(selectedConversation.id, v as 'open' | 'resolved' | 'pending')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Open
                    </span>
                  </SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Pending
                    </span>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      Resolved
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange(selectedConversation.id, 'resolved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => confirmDelete(selectedConversation.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
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
                        <Badge variant="secondary" className="text-xs font-normal">
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
                          (isAI || isAgent) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          {isAI ? <Bot className="h-4 w-4" /> : isAgent ? 'A' : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2.5 max-w-md',
                          (isAgent || isAI)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {isAI && (
                          <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            AI Assistant
                          </p>
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
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-muted/20">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-10 w-10 opacity-40" />
            </div>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1 max-w-xs">
              Choose a conversation from the list to view messages and respond to your visitors
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This will permanently remove all messages and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
