'use client'

import { useState } from 'react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MessageCircle, Globe, Clock } from 'lucide-react'
import type { Visitor } from '@/lib/types'

interface VisitorWithDetails extends Visitor {
  conversations: { count: number }[]
}

interface VisitorsTableProps {
  visitors: VisitorWithDetails[]
}

export function VisitorsTable({ visitors: initialVisitors }: VisitorsTableProps) {
  const [visitors] = useState(initialVisitors)
  const [search, setSearch] = useState('')

  const filteredVisitors = visitors.filter(visitor => {
    if (!search) return true
    return (
      visitor.name?.toLowerCase().includes(search.toLowerCase()) ||
      visitor.email?.toLowerCase().includes(search.toLowerCase())
    )
  })

  const formatDate = (date: string) => {
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visitors</h1>
        <p className="text-muted-foreground mt-1">
          View all visitors who have interacted with your widget
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
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Conversations</TableHead>
              <TableHead>First Seen</TableHead>
              <TableHead>Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No visitors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVisitors.map((visitor) => {
                const conversationCount = visitor.conversations?.[0]?.count || 0
                const isRecent = new Date().getTime() - new Date(visitor.last_seen_at).getTime() < 3600000 // 1 hour

                return (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(visitor.name || 'A').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isRecent && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {visitor.name || 'Anonymous Visitor'}
                          </p>
                          {visitor.metadata?.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {visitor.metadata.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {visitor.email || 'Not provided'}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        {conversationCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(visitor.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={isRecent ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                          {formatDate(visitor.last_seen_at)}
                        </span>
                        {isRecent && <Badge variant="secondary" className="text-xs">Active</Badge>}
                      </div>
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
