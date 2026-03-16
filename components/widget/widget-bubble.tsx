'use client'

import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        initial={false}
        animate={isOpen ? "open" : "closed"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'flex items-center justify-center rounded-full cursor-pointer transition-shadow duration-300',
          !isOpen && getAnimationClass(),
          className
        )}
        style={{
          width: size.button,
          height: size.button,
          background: bubbleIcon === 'glassOrb' 
            ? 'transparent' 
            : isOpen ? '#1f2937' : getBackgroundStyle(),
          border: bubbleIcon === 'glassOrb' 
            ? 'none' 
            : isOpen ? 'none' : getBorderStyle(),
          color: isOpen ? 'white' : getTextColor(),
          boxShadow: bubbleIcon === 'glassOrb' 
            ? 'none' 
            : isOpen ? '0 10px 25px rgba(0,0,0,0.2)' : getShadowStyle(),
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <AnimatePresence mode="wait">
          {bubbleIcon === 'glassOrb' ? (
            <motion.div 
              key="glass-orb"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="transition-all duration-300"
              style={{
                filter: bubbleShadow ? 'drop-shadow(0 0 15px rgba(0, 255, 255, 0.4))' : 'none',
              }}
            >
              <GlassOrbAvatar
                glyph={isOpen ? 'X' : glassOrbGlyph}
                glyphFont={isOpen ? 'Arial' : 'Times New Roman'}
                size={size.button}
                variant="default"
                interactive={true}
                forceState={isOpen ? 'listening' : 'idle'}
                forceGlyphReveal={isOpen}
                hideRingParticles={isOpen}
                style={{ position: 'relative' }}
              />
            </motion.div>
          ) : isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <X style={{ width: size.icon, height: size.icon }} />
            </motion.div>
          ) : (
            <motion.div
              key="bubble-icon"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {IconComponent && <IconComponent style={{ width: size.icon, height: size.icon }} />}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Notification Badge Suggestion (Subtle) */}
        {!isOpen && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ 
              scale: 1,
              y: [0, -2, 0]
            }}
            transition={{
              y: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              },
              scale: {
                duration: 0.3
              }
            }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"
          />
        )}
      </motion.button>
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
