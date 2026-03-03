'use client'

import dynamic from 'next/dynamic'
import type { Organization } from '@/lib/types'

const InstallationGuide = dynamic(
  () => import('@/components/dashboard/installation-guide').then(m => ({ default: m.InstallationGuide })),
  { ssr: false, loading: () => <div className="p-6 min-h-[400px]" /> }
)

interface Props {
  organization: Organization
  baseUrl: string
}

export function InstallationGuideClient({ organization, baseUrl }: Props) {
  return <InstallationGuide organization={organization} baseUrl={baseUrl} />
}
