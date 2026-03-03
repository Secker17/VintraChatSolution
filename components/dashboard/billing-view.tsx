'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Check, Zap, MessageCircle, Bot, Users, Star } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'
import { getPlanLimits, type Organization } from '@/lib/types'
import { Checkout } from '@/components/checkout'

interface BillingViewProps {
  organization: Organization
}

export function BillingView({ organization }: BillingViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  const planLimits = getPlanLimits(organization?.plan)
  const conversationsUsed = organization.conversations_this_month
  const conversationsLimit = planLimits.conversations
  const conversationPercentage = conversationsLimit > 0 
    ? (conversationsUsed / conversationsLimit) * 100 
    : 0

  const aiResponsesUsed = organization.ai_responses_used
  const aiResponsesLimit = planLimits.aiResponses
  const aiResponsesPercentage = aiResponsesLimit > 0 
    ? (aiResponsesUsed / aiResponsesLimit) * 100 
    : 0

  if (selectedProduct) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedProduct(null)}
          className="mb-4"
        >
          Back to Plans
        </Button>
        <Checkout productId={selectedProduct} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge className="capitalize">{organization.plan}</Badge>
              </CardTitle>
              <CardDescription>
                Your current subscription and usage
              </CardDescription>
            </div>
            {organization.plan !== 'enterprise' && (
              <Zap className="h-8 w-8 text-amber-500" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Conversations
                </span>
                <span>
                  {conversationsLimit === -1 
                    ? `${conversationsUsed} used`
                    : `${conversationsUsed} / ${conversationsLimit}`}
                </span>
              </div>
              {conversationsLimit !== -1 && (
                <Progress value={conversationPercentage} className="h-2" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Responses
                </span>
                <span>
                  {aiResponsesLimit === -1 
                    ? `${aiResponsesUsed} used`
                    : `${aiResponsesUsed} / ${aiResponsesLimit}`}
                </span>
              </div>
              {aiResponsesLimit !== -1 && (
                <Progress value={aiResponsesPercentage} className="h-2" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {planLimits.teamMembers === -1 
                ? 'Unlimited team members'
                : `Up to ${planLimits.teamMembers} team member${planLimits.teamMembers > 1 ? 's' : ''}`}
            </span>
            {planLimits.customBranding && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                Custom branding
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free Plan */}
          <Card className={organization.plan === 'free' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Free
                {organization.plan === 'free' && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  100 conversations/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  50 AI responses/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  1 team member
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  VintraChat branding
                </li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={organization.plan === 'pro' ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Pro
                  <Badge variant="secondary">Popular</Badge>
                </CardTitle>
                {organization.plan === 'pro' && (
                  <Badge>Current</Badge>
                )}
              </div>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$29</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {PRODUCTS[0].features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              {organization.plan === 'pro' ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => setSelectedProduct('pro-monthly')}
                >
                  Upgrade to Pro
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className={organization.plan === 'enterprise' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Enterprise
                {organization.plan === 'enterprise' && (
                  <Badge>Current</Badge>
                )}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$99</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {PRODUCTS[1].features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              {organization.plan === 'enterprise' ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => setSelectedProduct('enterprise-monthly')}
                >
                  Upgrade to Enterprise
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
