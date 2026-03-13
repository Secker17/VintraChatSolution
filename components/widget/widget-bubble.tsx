'use client'

import { forwardRef } from 'react'
import { MessageCircle, MessageSquare, HeadphonesIcon, HandIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import GlassOrbAvatar from '@/components/ui/glass-orb-avatar'
import type { WidgetSettings } from '@/lib/types'

const BUBBLE_ICONS = {
  chat: MessageCircle,
  message: MessageSquare,
  support: HeadphonesIcon,
  wave: HandIcon,
} as const

const SIZES = {
  small: { button: 48, icon: 20 },
  medium: { button: 60, icon: 28 },
  large: { button: 72, icon: 32 },
} as const

interface WidgetBubbleProps {
  settings: WidgetSettings
  onClick?: () => void
  isOpen?: boolean
  className?: string
}

export const WidgetBubble = forwardRef<HTMLButtonElement, WidgetBubbleProps>(
  function WidgetBubble({ settings, onClick, isOpen = false, className }, ref) {
    const {
      primaryColor = '#0066FF',
      bubbleIcon = 'chat',
      bubbleSize = 'medium',
      bubbleStyle = 'solid',
      bubbleShadow = true,
      bubbleAnimation = 'none',
      glassOrbGlyph = 'V',
    } = settings

    const size = SIZES[bubbleSize] || SIZES.medium
    const IconComponent = BUBBLE_ICONS[bubbleIcon as keyof typeof BUBBLE_ICONS]

    // Calculate background based on style
    const getBackgroundStyle = () => {
      if (bubbleIcon === 'glassOrb') return 'transparent'
      if (bubbleStyle === 'gradient') {
        return `linear-gradient(135deg, ${primaryColor} 0%, ${darkenColor(primaryColor, 20)} 100%)`
      }
      if (bubbleStyle === 'outline') return 'transparent'
      return primaryColor
    }

    const getBorderStyle = () => {
      if (bubbleIcon === 'glassOrb') return 'none'
      if (bubbleStyle === 'outline') return `2px solid ${primaryColor}`
      return 'none'
    }

    const getTextColor = () => {
      if (bubbleStyle === 'outline') return primaryColor
      return 'white'
    }

    const getShadowStyle = () => {
      if (bubbleIcon === 'glassOrb') return 'none'
      if (!bubbleShadow) return 'none'
      return `0 4px 16px ${hexToRgba(primaryColor, 0.4)}`
    }

    const getAnimationClass = () => {
      switch (bubbleAnimation) {
        case 'pulse': return 'animate-pulse'
        case 'bounce': return 'animate-bounce'
        case 'shake': return 'animate-shake'
        default: return ''
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          'flex items-center justify-center rounded-full cursor-pointer transition-all duration-300',
          'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
          !isOpen && getAnimationClass(),
          className
        )}
        style={{
          width: size.button,
          height: size.button,
          background: isOpen ? '#1f2937' : getBackgroundStyle(),
          border: isOpen ? 'none' : getBorderStyle(),
          color: isOpen ? 'white' : getTextColor(),
          boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.3)' : getShadowStyle(),
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* When chat is open, show X close button */}
        {isOpen ? (
          <X 
            className="transition-transform duration-200"
            style={{ width: size.icon, height: size.icon }} 
          />
        ) : bubbleIcon === 'glassOrb' ? (
          <div 
            className="transition-all duration-300 hover:brightness-110"
            style={{
              filter: bubbleShadow ? 'drop-shadow(0 0 15px rgba(0, 255, 255, 0.5))' : 'none',
            }}
          >
            <GlassOrbAvatar
              glyph={glassOrbGlyph}
              glyphFont="Times New Roman"
              size={size.button}
              variant="default"
              interactive={true}
              forceState="idle"
              style={{ position: 'relative' }}
            />
          </div>
        ) : IconComponent ? (
          <IconComponent 
            className="transition-transform duration-200"
            style={{ width: size.icon, height: size.icon }} 
          />
        ) : null}
      </button>
    )
  }
)

// Helper functions
function darkenColor(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const dr = Math.floor(r * (100 - percent) / 100)
  const dg = Math.floor(g * (100 - percent) / 100)
  const db = Math.floor(b * (100 - percent) / 100)
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
