import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import { gateway } from "@ai-sdk/gateway"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Create admin client for widget API (no RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { widgetKey, conversationId, message } = await request.json()

    if (!widgetKey || !conversationId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders })
    }

    // Get organization and AI settings
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, ai_settings(*)")
      .eq("widget_key", widgetKey)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404, headers: corsHeaders })
    }

    const aiSettings = org.ai_settings?.[0] || org.ai_settings

    if (!aiSettings?.enabled) {
      return NextResponse.json({ enabled: false }, { headers: corsHeaders })
    }

    // Check if any agent is online
    const { data: onlineAgents } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("organization_id", org.id)
      .eq("status", "online")
      .limit(1)

    // If agents are online and not set to auto-respond, skip AI
    if (onlineAgents && onlineAgents.length > 0 && !aiSettings.auto_respond_when_offline) {
      return NextResponse.json({ enabled: false, reason: "agents_online" }, { headers: corsHeaders })
    }

    // Get conversation history for context
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("content, sender_type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10)

    // Build system prompt
    const systemPrompt = `You are an AI customer support assistant for a business. Your responses should be ${aiSettings.response_style || "friendly"} and helpful.

${aiSettings.knowledge_base ? `Here is information about the business you can use to answer questions:\n${aiSettings.knowledge_base}` : ""}

Guidelines:
- Be concise and helpful
- If you don't know something, say so politely
- Don't make up information
- If the question is complex, suggest speaking with a human agent
- Keep responses under 150 words

${aiSettings.fallback_message ? `If you can't help, say: "${aiSettings.fallback_message}"` : ""}`

    // Build conversation context
    const conversationHistory = messages?.map(m => ({
      role: m.sender_type === "visitor" ? "user" as const : "assistant" as const,
      content: m.content
    })) || []

    // Generate AI response
    const result = streamText({
      model: gateway("openai/gpt-4o-mini"),
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user" as const, content: message }
      ],
      maxTokens: 300,
    })

    // Save AI message to database
    const responseText = await result.text

    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      sender_id: "ai-assistant",
      content: responseText,
    })

    // Update AI responses used count
    await supabaseAdmin.rpc("increment_ai_responses", { org_id: org.id })

    return NextResponse.json({ 
      response: responseText,
      enabled: true 
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("AI response error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
