'use client'

import Link from "next/link"
import { MessageSquare, Zap, Users, BarChart3, Bot, Code, CheckCircle2, ArrowRight, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

const features = [
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Real-time conversations with your website visitors. Never miss a lead again."
  },
  {
    icon: Bot,
    title: "AI Auto-Response",
    description: "AI answers questions when you're offline using your knowledge base."
  },
  {
    icon: Users,
    title: "Team Inbox",
    description: "Collaborate with your team. Assign conversations and track performance."
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track conversations, response times, and customer satisfaction."
  },
  {
    icon: Code,
    title: "Easy Install",
    description: "Add to any website with a single line of code. Works everywhere."
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Get started in under 2 minutes. No technical skills required."
  }
]

const pricing = [
  {
    name: "Free",
    price: "$0",
    description: "For personal websites",
    features: [
      "100 conversations/month",
      "1 team member",
      "Basic AI responses",
      "ChatFlow branding",
      "Email support"
    ],
    cta: "Get Started Free",
    popular: false
  },
  {
    name: "Pro",
    price: "$29",
    description: "For growing businesses",
    features: [
      "Unlimited conversations",
      "5 team members",
      "Advanced AI with custom knowledge",
      "Remove branding",
      "Priority support",
      "Canned responses"
    ],
    cta: "Start Pro Trial",
    popular: true
  },
  {
    name: "Enterprise",
    price: "$99",
    description: "For larger teams",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Custom AI training",
      "API access",
      "Dedicated support",
      "SLA guarantee"
    ],
    cta: "Contact Sales",
    popular: false
  }
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <MessageSquare className="h-5 w-5 text-background" />
            </div>
            <span className="text-xl font-bold">ChatFlow</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4">
            <nav className="flex flex-col gap-4">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
                Login
              </Link>
              <Button asChild className="w-full">
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Zap className="h-4 w-4" />
            <span>Now with AI-powered responses</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-balance">
            Live chat for your website in{" "}
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              seconds
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Add a beautiful chat widget to your website with one line of code. 
            AI handles questions when you&apos;re away, and your team manages everything from one inbox.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/sign-up">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link href="#features">See Features</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free forever for small websites. No credit card required.
          </p>
        </div>

        {/* Demo preview */}
        <div className="mt-16 mx-auto max-w-4xl">
          <div className="relative rounded-xl border bg-card p-2 shadow-2xl">
            <div className="rounded-lg bg-muted/50 p-8">
              <div className="flex gap-4">
                {/* Conversation list mock */}
                <div className="hidden md:block w-64 space-y-3">
                  <div className="rounded-lg bg-background p-3 border-l-2 border-foreground">
                    <p className="text-sm font-medium">Sarah Miller</p>
                    <p className="text-xs text-muted-foreground truncate">Hi, I have a question about...</p>
                  </div>
                  <div className="rounded-lg bg-background p-3 opacity-60">
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-muted-foreground truncate">Thanks for the help!</p>
                  </div>
                  <div className="rounded-lg bg-background p-3 opacity-60">
                    <p className="text-sm font-medium">Emma Wilson</p>
                    <p className="text-xs text-muted-foreground truncate">What are your pricing...</p>
                  </div>
                </div>
                {/* Chat mock */}
                <div className="flex-1 space-y-4">
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                      <span className="text-xs font-medium">SM</span>
                    </div>
                    <div className="rounded-lg bg-background p-3 max-w-xs">
                      <p className="text-sm">Hi! I have a question about your pricing plans.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="rounded-lg bg-foreground text-background p-3 max-w-xs">
                      <p className="text-sm">Hi Sarah! Happy to help. What would you like to know?</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center">
                      <span className="text-xs font-medium text-background">AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need for customer support
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features to help you connect with customers
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 hover:border-foreground/20 transition-colors">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Code Example Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One line of code
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Add ChatFlow to any website in seconds
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg bg-foreground text-background p-6 font-mono text-sm overflow-x-auto">
            <code>
              {'<script src="https://yourapp.com/widget/chatflow.js" data-key="YOUR_KEY"></script>'}
            </code>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Works with any website: WordPress, Shopify, React, Next.js, and more
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, upgrade when you need more
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {pricing.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-2 border-foreground' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "$0" && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-foreground" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/auth/sign-up">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center rounded-2xl bg-muted p-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to start chatting?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of businesses using ChatFlow to connect with customers.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/auth/sign-up">
              Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground">
                <MessageSquare className="h-4 w-4 text-background" />
              </div>
              <span className="font-semibold">ChatFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with Next.js, Supabase, and Stripe
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
