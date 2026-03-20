'use client'

import { motion } from 'framer-motion'
import { X, Bot, Sparkles } from 'lucide-react'
import GlassOrbAvatar from '@/components/ui/glass-orb-avatar'
import type { WidgetSettings } from './types'
import styles from './styles/chat-header.module.css'

interface ChatHeaderProps {
  config: {
    name: string
    settings: WidgetSettings
    isOnline?: boolean
  }
  onClose?: () => void
  onAiToggle?: () => void
  aiEnabled?: boolean
  className?: string
}

export function ChatHeader({ 
  config, 
  onClose, 
  onAiToggle, 
  aiEnabled = false,
  className 
}: ChatHeaderProps) {
  const { name, settings, isOnline = false } = config
  const primaryColor = settings.primaryColor || '#0066FF'
  const bubbleAnimation = settings.bubbleAnimation || 'none'
  const customTheme = settings.customTheme || 'auto'
  const borderRadius = settings.borderRadius || 'medium'
  const fontFamily = settings.fontFamily || 'system-ui'

  const getBorderRadius = () => {
    switch (borderRadius) {
      case 'small': return '0.5rem'
      case 'large': return '1.5rem'
      default: return '1rem'
    }
  }

  const getFontFamily = () => {
    switch (customTheme) {
      case 'dark': return 'Georgia, serif'
      case 'light': return 'system-ui, sans-serif'
      default: return fontFamily
    }
  }

  return (
    <div 
      className={`${styles.header} ${className || ''}`}
      style={{ 
        '--primary-color': primaryColor,
        '--primary-color-dd': primaryColor + 'dd',
        '--border-radius': getBorderRadius(),
        '--font-family': getFontFamily(),
      } as React.CSSProperties
    }
    >
      {/* Decorative Elements */}
      <div className={styles.glassOrb} />
      
      <div className={styles.content}>
        <div className={styles.avatar}>
          {settings.bubbleIcon === 'glassOrb' ? (
            <div className={styles.glassOrb}>
              <GlassOrbAvatar
                glyph={settings.glassOrbGlyph || 'V'}
                glyphFont="Times New Roman"
                size={48}
                variant="chatHeader"
              />
            </div>
          ) : (
            <div className={styles.defaultAvatar}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className={styles.text}>
          <motion.h2 
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={`${styles.title} ${bubbleAnimation === 'pulse' ? 'animate-pulse' : ''}`}
          >
            {name}
          </motion.h2>
          <div className={styles.status}>
            <span className={styles.statusDot} />
            <span className={styles.statusText}>
              {isOnline ? 'Online now' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className={styles.actions}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAiToggle}
            className={`${styles.aiButton} ${bubbleAnimation === 'pulse' ? 'animate-pulse' : ''}`}
          >
            <Bot className={styles.icon} />
            {aiEnabled && <Sparkles className={styles.sparkles} />}
          </motion.button>
          {onClose && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={styles.closeButton}
            >
              <X className={styles.icon} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
