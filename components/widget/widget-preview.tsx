'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChatWidget, type ChatWidgetConfig } from '../chat-widget/index'
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
  const chatHeight = 480
  
  // Calculate minimum container height when chat is open
  const minHeightWhenOpen = chatHeight + avatarOffset * 2 + gap + 50

  // Position calculations - for preview, position chat overlapping the bubble slightly
  const getChatPosition = () => {
    // For preview: position chat overlapping the bubble button slightly
    const bubbleBottom = avatarOffset
    const bubbleRight = avatarOffset
    const bubbleLeft = avatarOffset
    const overlapOffset = size.button * 0.3 // Overlap by 30% of bubble size
    
    switch (position) {
      case 'bottom-right':
        // Position chat to overlap bubble from the left side
        const rightPosition = bubbleRight - chatWidth + overlapOffset
        return { 
          left: Math.max(0, rightPosition), 
          bottom: bubbleBottom + overlapOffset 
        }
      case 'bottom-left':
        // Position chat to overlap bubble from the right side
        return { 
          right: bubbleLeft - overlapOffset, 
          bottom: bubbleBottom + overlapOffset 
        }
      default:
        // Default to bottom-right behavior
        const defaultRightPosition = bubbleRight - chatWidth + overlapOffset
        return { 
          left: Math.max(0, defaultRightPosition), 
          bottom: bubbleBottom + overlapOffset 
        }
    }
  }

  const chatPosition = getChatPosition()

  const handleToggle = () => {
    setIsOpen(prev => !prev)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  // Calculate actual container height - always use 100% for preview
  const containerHeight = '100%'

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-visible rounded-lg bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
        className
      )}
      style={{ 
        height: containerHeight,
        minHeight: minHeightWhenOpen,
        position: 'relative',
        transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
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
          ...chatPosition,
          zIndex: 50,
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

      {/* Bubble Button - Always visible, transforms to X when open */}
      <div 
        className="absolute transition-all duration-300"
        style={{
          bottom: avatarOffset,
          right: position === 'bottom-right' ? avatarOffset : 
                position === 'bottom-left' ? undefined : avatarOffset,
          left: position === 'bottom-left' ? avatarOffset : undefined,
          zIndex: 100, // Ensure bubble is above chat window
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
