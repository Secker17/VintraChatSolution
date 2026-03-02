"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Checkout } from "@/components/checkout"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const productId = searchParams.get("plan") || "pro-plan"

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Complete Your Subscription</h1>
        <Checkout productId={productId} />
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
