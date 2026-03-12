'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MessageCircle, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { Conversation, Visitor } from '@/lib/types'

interface ConversationWithDetails extends Conversation {
  visitor: Visitor
  messages: { count: number }[]
}

interface ConversationsTableProps {
  conversations: ConversationWithDetails[]
}

export function ConversationsTable({ conversations: initialConversations }: ConversationsTableProps) {
  const [conversations] = useState(initialConversations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !search || 
      conv.visitor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      conv.visitor?.email?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-emerald-500">Open</Badge>
      case 'pending':
        return <Badge className="bg-amber-500">Pending</Badge>
      case 'resolved':
        return <Badge variant="secondary">Resolved</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 space-y-6 min-h-full">
      <div>
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all your conversations
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No conversations found
                </TableCell>
              </TableRow>
            ) : (
              filteredConversations.map((conv) => {
                const visitorName = conv.visitor?.name || conv.visitor?.email || 'Anonymous'
                const messageCount = conv.messages?.[0]?.count || 0

                return (
                  <TableRow key={conv.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {visitorName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{visitorName}</p>
                          {conv.visitor?.email && conv.visitor?.name && (
                            <p className="text-sm text-muted-foreground">
                              {conv.visitor.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(conv.status)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        {messageCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(conv.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(conv.last_message_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard?conversation=${conv.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
