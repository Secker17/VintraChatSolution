export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: 'month' | 'year'
  features: string[]
}

export const PRODUCTS: Product[] = [
  {
    id: 'pro-monthly',
    name: 'Pro Plan',
    description: 'Perfect for growing businesses',
    priceInCents: 2900, // $29/month
    interval: 'month',
    features: [
      '1,000 conversations/month',
      '500 AI responses/month',
      'Up to 5 team members',
      'Remove branding',
      'Priority support',
      'Custom widget styling',
    ],
  },
  {
    id: 'enterprise-monthly',
    name: 'Enterprise Plan',
    description: 'For large organizations',
    priceInCents: 9900, // $99/month
    interval: 'month',
    features: [
      'Unlimited conversations',
      'Unlimited AI responses',
      'Unlimited team members',
      'Remove branding',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
]
