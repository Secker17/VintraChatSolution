'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChatWidget, type ChatWidgetConfig } from './chat-widget'
import { WidgetBubble } from './widget-bubble'
import type { WidgetSettings } from '@/lib/types'

interface WidgetPreviewProps {
  settings: WidgetSettings
  name?: string
  /** Height of the preview container */
  height?: number | string
  /** Show the chat window immediately (for testing) */
  startOpen?: boolean
  /** Additional class name */
  className?: string
}

/**
 * WidgetPreview - An exact replica of the deployed chat widget for preview purposes.
 * This component mirrors the production widget (vintrachat.js) behavior precisely,
 * including layout, positioning, animations, and interactions.
 * 
 * In preview mode, it uses mock bot responses instead of real API calls.
 */
export function WidgetPreview({ 
  settings, 
  name = 'Preview Widget',
  height = 500,
  startOpen = false,
  className 
}: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(startOpen)
  const containerRef = useRef<HTMLDivElement>(null)

  const config: ChatWidgetConfig = {
    name,
    settings,
    isOnline: true,
    aiEnabled: true,
  }

  const position = settings.position || 'bottom-right'
  const bubbleSize = settings.bubbleSize || 'medium'
  const isGlassOrb = settings.bubbleIcon === 'glassOrb'
  
  // Calculate dimensions based on bubble size
  const SIZES = {
    small: { button: 48, icon: 20 },
    medium: { button: 60, icon: 28 },
    large: { button: 72, icon: 32 },
  }
  const size = SIZES[bubbleSize] || SIZES.medium
  const avatarOffset = 20
  const gap = 16
  const chatWidth = 380
  const chatHeight = 520

  // Position calculations for glassOrb mode
  const getChatPosition = () => {
    if (!isGlassOrb) {
      return position === 'bottom-right' 
        ? { right: 20, bottom: size.button + 30 }
        : { left: 20, bottom: size.button + 30 }
    }
    // GlassOrb: chat opens beside the avatar
    return position === 'bottom-right'
      ? { right: avatarOffset + size.button + gap, bottom: avatarOffset }
      : { left: avatarOffset + size.button + gap, bottom: avatarOffset }
  }

  const chatPosition = getChatPosition()

  const handleToggle = () => {
    setIsOpen(prev => !prev)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
        className
      )}
      style={{ height }}
    >
      {/* Chat Window */}
      <div 
        className={cn(
          'absolute transition-all duration-300 ease-out rounded-2xl overflow-hidden shadow-2xl bg-background',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none scale-95'
        )}
        style={{
          width: isOpen ? chatWidth : 0,
          height: isOpen ? chatHeight : 0,
          bottom: chatPosition.bottom,
          right: 'right' in chatPosition ? chatPosition.right : undefined,
          left: 'left' in chatPosition ? chatPosition.left : undefined,
          maxHeight: `calc(100% - ${avatarOffset * 2}px)`,
          maxWidth: `calc(100% - ${avatarOffset * 2}px)`,
        }}
      >
        {isOpen && (
          <ChatWidget 
            config={config} 
            isPreview={true}
            onClose={handleClose}
          />
        )}
      </div>

      {/* Bubble Button */}
      <div 
        className={cn(
          'absolute transition-all duration-300',
          // For non-glassOrb: hide when open
          !isGlassOrb && isOpen && 'scale-0 opacity-0',
          // For glassOrb: always visible, same position
          isGlassOrb && 'scale-100 opacity-100'
        )}
        style={{
          bottom: avatarOffset,
          right: position === 'bottom-right' ? avatarOffset : undefined,
          left: position === 'bottom-left' ? avatarOffset : undefined,
        }}
      >
        <WidgetBubble 
          settings={settings}
          onClick={handleToggle}
          isOpen={isOpen}
        />
      </div>
    </div>
  )
}
