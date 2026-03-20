import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Mock AI response for development when env vars are not set
const mockAiResponse = {
  id: 'ai-mock-response',
  content: "Hello! I'm your AI assistant. I'm here to help you with any questions you might have. How can I assist you today?",
  sender_type: 'ai' as const,
  created_at: new Date().toISOString()
}

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function POST(request: NextRequest) {
  try {
    const { widgetKey, conversationId, message } = await request.json()

    if (!widgetKey || !conversationId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders })
    }

    // If supabase is not available, use mock data
    if (!supabaseAdmin) {
      console.log('Using mock data for AI response')
      
      if (widgetKey === 'demo-widget-key-123') {
        return NextResponse.json({
          enabled: true,
          response: mockAiResponse
        }, { headers: corsHeaders })
      } else {
        return NextResponse.json({ error: "Organization not found" }, { status: 404, headers: corsHeaders })
      }
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

    const aiSettings = Array.isArray(org.ai_settings) ? org.ai_settings[0] : org.ai_settings

    // Check if AI is enabled (default is false/disabled)
    const isAiEnabled = aiSettings?.enabled === true
    
    if (!isAiEnabled) {
      return NextResponse.json({ enabled: false }, { headers: corsHeaders })
    }

    // Check if conversation has handoff requested (AI should not respond)
    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .select("handoff_requested, assigned_agent_id")
      .eq("id", conversationId)
      .single()

    if (conv?.handoff_requested || conv?.assigned_agent_id) {
      return NextResponse.json({ enabled: false, reason: "human_takeover" }, { headers: corsHeaders })
    }

    // Check if any agent is online
    const { data: onlineAgents } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("organization_id", org.id)
      .eq("status", "online")
      .limit(1)

    if (onlineAgents && onlineAgents.length > 0 && !aiSettings.auto_respond_when_offline) {
      return NextResponse.json({ enabled: false, reason: "agents_online" }, { headers: corsHeaders })
    }

    // Get conversation history
    const { data: history } = await supabaseAdmin
      .from("messages")
      .select("content, sender_type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10)

    const systemPrompt = `You are a helpful AI customer support assistant. Respond in a ${aiSettings.response_style || "friendly"} tone.
${aiSettings.knowledge_base ? `\nBusiness information:\n${aiSettings.knowledge_base}` : ""}
- Be concise (under 120 words)
- Be honest if you don't know something
- If the user asks to speak with a human, acknowledge it warmly and let them know an agent will be with them soon
${aiSettings.fallback_message ? `- If you cannot help, say: "${aiSettings.fallback_message}"` : ""}`

    const conversationHistory = (history || [])
      .filter(m => m.sender_type === "visitor" || m.sender_type === "ai" || m.sender_type === "agent")
      .map(m => ({
        role: m.sender_type === "visitor" ? "user" as const : "assistant" as const,
        content: m.content,
      }))

    // Check for XAI_API_KEY (Grok)
    if (!process.env.XAI_API_KEY) {
      console.warn('[v0] XAI_API_KEY is not set - AI features disabled')
      return NextResponse.json({ enabled: false, reason: "ai_not_configured" }, { headers: corsHeaders })
    }

    const { text: responseText } = await generateText({
      model: xai("grok-4", {
        apiKey: process.env.XAI_API_KEY,
      }),
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user" as const, content: message },
      ],
      maxTokens: 300,
    })

    // Save AI message to database
    const { data: savedMsg, error: saveError } = await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      sender_id: null,
      content: responseText,
    }).select().single()

    if (saveError) {
      console.error('[v0] Failed to save AI message:', saveError)
      // Return response anyway, but without saving
      return NextResponse.json({ response: responseText, enabled: true }, { headers: corsHeaders })
    }

    return NextResponse.json({ 
      response: responseText, 
      enabled: true,
      messageId: savedMsg?.id,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("AI response error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
