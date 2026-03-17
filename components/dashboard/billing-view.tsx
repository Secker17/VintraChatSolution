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
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentPlan, setCurrentPlan] = useState(organization.plan)

  // Check if we're in development/localhost mode
  const isLocalhost = process.env.NODE_ENV === 'development' || 
                     process.env.VERCEL_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

  const planLimits = getPlanLimits(currentPlan)
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

  // Handle direct plan update in localhost
  const handleDirectPlanUpdate = async (newPlan: 'free' | 'pro' | 'enterprise') => {
    if (!isLocalhost) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/organizations/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })

      if (response.ok) {
        // Update local state instead of refreshing
        setCurrentPlan(newPlan)
      } else {
        const error = await response.json()
        console.error('Failed to update plan:', error.error)
      }
    } catch (error) {
      console.error('Failed to update plan:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (selectedProduct && !isLocalhost) {
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 min-h-full">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and view usage
          {isLocalhost && (
            <span className="block text-sm text-green-600 mt-1">
              🚀 Development mode: Plan changes are applied instantly without Stripe
            </span>
          )}
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge className="capitalize">{currentPlan}</Badge>
              </CardTitle>
              <CardDescription>
                Your current subscription and usage
              </CardDescription>
            </div>
            {currentPlan !== 'enterprise' && (
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
          <Card className={currentPlan === 'free' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Free
                {currentPlan === 'free' && (
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
              {currentPlan === 'free' ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : isLocalhost ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleDirectPlanUpdate('free')}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Downgrade to Free'}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSelectedProduct('free-monthly')}
                >
                  Downgrade to Free
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={currentPlan === 'pro' ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Pro
                  <Badge variant="secondary">Popular</Badge>
                </CardTitle>
                {currentPlan === 'pro' && (
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
              {currentPlan === 'pro' ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : isLocalhost ? (
                <Button 
                  className="w-full" 
                  onClick={() => handleDirectPlanUpdate('pro')}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Upgrade to Pro'}
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
          <Card className={currentPlan === 'enterprise' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Enterprise
                {currentPlan === 'enterprise' && (
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
              {currentPlan === 'enterprise' ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : isLocalhost ? (
                <Button 
                  className="w-full"
                  onClick={() => handleDirectPlanUpdate('enterprise')}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Upgrade to Enterprise'}
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
