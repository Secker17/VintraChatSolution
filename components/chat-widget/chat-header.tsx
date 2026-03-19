'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { X, Bot, Sparkles } from 'lucide-react'
import GlassOrbAvatar from '@/components/ui/glass-orb-avatar'
import type { WidgetSettings } from './types'

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

  return (
    <div 
      className={cn(
        "shrink-0 px-6 py-6 relative overflow-hidden",
        className
      )}
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
      }}
    >
      {/* Decorative Elements */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" 
      />
      <div 
        className="absolute -bottom-20 -right-10 w-48 h-48 bg-black/20 rounded-full blur-[60px] pointer-events-none" 
      />
      <div 
        className="absolute -bottom-20 -left-10 w-48 h-48 bg-black/20 rounded-full blur-[60px] pointer-events-none" 
      />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative"
          >
            {settings.bubbleIcon === 'glassOrb' ? (
              <div className="relative">
                <GlassOrbAvatar
                  glyph={settings.glassOrbGlyph || 'V'}
                  glyphFont="Times New Roman"
                  size={48}
                  variant="chatHeader"
                  interactive={false}
                  forceState="idle"
                  className="rounded-full shadow-2xl ring-4 ring-white/10"
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white font-bold text-xl shadow-2xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </motion.div>
          <div className="text-white flex flex-col gap-0.5">
            <motion.h2 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="font-bold text-lg tracking-tight"
            >
              {name}
            </motion.h2>
            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex items-center gap-2 mt-1"
            >
              <div className="relative flex items-center justify-center">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  isOnline ? "bg-emerald-400" : "bg-white/40"
                )} />
                <span className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
              <span className="text-xs font-medium text-white/80">
                {isOnline ? 'Online now' : 'Offline'}
              </span>
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onAiToggle}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 text-white shadow-sm border border-white/10 group"
          >
            <Bot className={cn(
              "h-4 w-4 transition-all duration-300",
              aiEnabled ? "text-white" : "text-white/60"
            )} />
            {aiEnabled && (
              <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
            )}
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 text-white shadow-sm border border-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
