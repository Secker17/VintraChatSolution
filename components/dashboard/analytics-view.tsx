'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Users, CheckCircle, Clock, Bot, TrendingUp } from 'lucide-react'
import type { Organization } from '@/lib/types'

interface AnalyticsViewProps {
  stats: {
    totalConversations: number
    openConversations: number
    resolvedConversations: number
    totalMessages: number
    totalVisitors: number
    aiResponses: number
    conversationsThisMonth: number
  }
  organization: Organization
}

export function AnalyticsView({ stats, organization }: AnalyticsViewProps) {
  const resolutionRate = stats.totalConversations > 0
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100)
    : 0

  const avgMessagesPerConversation = stats.totalConversations > 0
    ? Math.round(stats.totalMessages / stats.totalConversations)
    : 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 min-h-full">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your chat performance and metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.conversationsThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Conversations</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openConversations}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">
              Unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Responses</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiResponses}</div>
            <p className="text-xs text-muted-foreground">
              Auto-generated replies
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resolution Rate</CardTitle>
            <CardDescription>Percentage of conversations resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl font-bold text-primary">{resolutionRate}%</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>{stats.resolvedConversations} resolved</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>{stats.openConversations} open</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation Metrics</CardTitle>
            <CardDescription>Average engagement statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. messages per conversation</span>
                <span className="font-medium">{avgMessagesPerConversation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total messages</span>
                <span className="font-medium">{stats.totalMessages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current plan</span>
                <span className="font-medium capitalize">{organization.plan}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tips to Improve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {stats.openConversations > 5 && (
              <li className="flex items-start gap-2">
                <span className="text-amber-500">*</span>
                You have {stats.openConversations} open conversations. Consider responding to reduce wait times.
              </li>
            )}
            {resolutionRate < 50 && stats.totalConversations > 10 && (
              <li className="flex items-start gap-2">
                <span className="text-amber-500">*</span>
                Your resolution rate is {resolutionRate}%. Try to resolve conversations to improve customer satisfaction.
              </li>
            )}
            {stats.aiResponses === 0 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500">*</span>
                Enable AI auto-responses to handle messages when you're offline.
              </li>
            )}
            {stats.totalVisitors > 0 && stats.totalConversations === 0 && (
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">*</span>
                You have visitors but no conversations. Make sure your widget is properly configured.
              </li>
            )}
            {stats.totalConversations === 0 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500">*</span>
                No conversations yet. Install the widget on your website to start receiving messages.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
