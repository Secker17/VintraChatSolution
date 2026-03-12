'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Inbox,
  Users,
  Settings,
  Bot,
  CreditCard,
  BarChart3,
  Zap,
  Code,
  Eye,
  MessageSquareText,
} from 'lucide-react'
import type { Organization, TeamMember } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface DashboardSidebarProps {
  organization: Organization
  teamMember: TeamMember
  user: User
}

const navigation = [
  { name: 'Inbox', href: '/dashboard', icon: Inbox, exact: true },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquareText },
  { name: 'Visitors', href: '/dashboard/visitors', icon: Users },
  { name: 'AI Assistant', href: '/dashboard/ai', icon: Bot },
  { name: 'Canned Responses', href: '/dashboard/canned-responses', icon: MessageSquareText },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Widget Preview', href: '/dashboard/widget-preview', icon: Eye },
  { name: 'Installation', href: '/dashboard/install', icon: Code },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardSidebar({ organization, teamMember }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Image
          src="/logo.png"
          alt="VintraChat logo"
          width={32}
          height={32}
          className="shrink-0"
        />
        <span className="font-semibold">VintraChat</span>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="flex flex-col gap-1 px-2">
          {navigation.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium capitalize">{organization.plan} Plan</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {organization.conversations_this_month} conversations this month
          </p>
          {organization.plan === 'free' && (
            <Link
              href="/dashboard/billing"
              className="mt-2 block text-xs font-medium text-primary hover:underline"
            >
              Upgrade for more features
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
