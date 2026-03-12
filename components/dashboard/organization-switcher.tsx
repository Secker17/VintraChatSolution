'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { Organization } from '@/lib/types'

interface OrganizationSwitcherProps {
  currentOrganization: Organization
}

interface OrgMembership {
  id: string
  role: string
  organization: Organization
}

export function OrganizationSwitcher({ currentOrganization }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [organizations, setOrganizations] = useState<OrgMembership[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations')
      const data = await response.json()
      if (response.ok) {
        setOrganizations(data.organizations || [])
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === currentOrganization.id) {
      setOpen(false)
      return
    }

    try {
      const response = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      })

      if (response.ok) {
        // Refresh the page to load new organization context
        router.refresh()
        window.location.reload()
      }
    } catch (error) {
      console.error('Error switching organization:', error)
    }

    setOpen(false)
  }

  // If user only has one organization, show a simple display
  if (!loading && organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium truncate max-w-[150px]">{currentOrganization.name}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {currentOrganization.plan}
        </Badge>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between px-2"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{currentOrganization.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup heading="Organizations">
              {organizations.map((membership) => (
                <CommandItem
                  key={membership.organization.id}
                  value={membership.organization.name}
                  onSelect={() => handleSwitchOrg(membership.organization.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentOrganization.id === membership.organization.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex-1 truncate">
                    <span className="font-medium">{membership.organization.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground capitalize">
                      ({membership.role})
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push('/auth/sign-up?newOrg=true')
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new organization
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
