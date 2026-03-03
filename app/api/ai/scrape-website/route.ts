import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Extract clean text from HTML
function extractText(html: string): string {
  // Remove script/style blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    // Convert block elements to newlines
    .replace(/<\/?(p|div|section|article|h[1-6]|li|br|tr)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

// Extract page title
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : ''
}

// Extract meta description
function extractDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  return match ? match[1].trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url, organizationId } = await request.json()
    if (!url || !organizationId) {
      return NextResponse.json({ error: 'Missing url or organizationId' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the website with a browser-like user agent
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VintraBot/1.0; +https://vintrachat.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en,nb;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch website (HTTP ${response.status})` },
        { status: 422 }
      )
    }

    const html = await response.text()
    const title = extractTitle(html)
    const description = extractDescription(html)
    const bodyText = extractText(html)

    // Limit to ~6000 chars to keep it useful but not overwhelming
    const truncated = bodyText.slice(0, 6000)

    const knowledgeBase = [
      title ? `Website: ${title}` : '',
      description ? `Description: ${description}` : '',
      '',
      truncated,
    ].filter(Boolean).join('\n')

    // Save to ai_settings
    const { error } = await supabase
      .from('ai_settings')
      .upsert(
        {
          organization_id: organizationId,
          website_url: parsedUrl.toString(),
          knowledge_base: knowledgeBase,
          website_scraped_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )

    if (error) {
      console.error('[scrape-website] DB error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      title,
      description,
      knowledgeBase,
      charCount: knowledgeBase.length,
    })
  } catch (err: any) {
    console.error('[scrape-website] error:', err)
    const msg = err?.name === 'TimeoutError'
      ? 'Website took too long to respond'
      : 'Failed to fetch website'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
