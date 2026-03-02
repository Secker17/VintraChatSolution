import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

// Use service role key for webhook handling
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          // Get the plan from metadata or line items
          const lineItem = subscription.items.data[0]
          let plan = "pro"
          
          if (lineItem.price.unit_amount) {
            if (lineItem.price.unit_amount >= 9900) {
              plan = "enterprise"
            } else if (lineItem.price.unit_amount >= 2900) {
              plan = "pro"
            }
          }

          // Update organization with subscription details
          // Find org by customer email
          const customer = await stripe.customers.retrieve(
            session.customer as string
          ) as Stripe.Customer

          if (customer.email) {
            // Find user by email
            const { data: users } = await supabaseAdmin.auth.admin.listUsers()
            const user = users.users.find(u => u.email === customer.email)

            if (user) {
              await supabaseAdmin
                .from("organizations")
                .update({
                  plan,
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: subscription.id,
                })
                .eq("owner_id", user.id)
            }
          }
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get updated plan
        const lineItem = subscription.items.data[0]
        let plan = "pro"
        
        if (lineItem.price.unit_amount) {
          if (lineItem.price.unit_amount >= 9900) {
            plan = "enterprise"
          } else if (lineItem.price.unit_amount >= 2900) {
            plan = "pro"
          }
        }

        // Update organization plan
        await supabaseAdmin
          .from("organizations")
          .update({ plan })
          .eq("stripe_subscription_id", subscription.id)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        
        // Downgrade to free plan
        await supabaseAdmin
          .from("organizations")
          .update({
            plan: "free",
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscription.id)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
