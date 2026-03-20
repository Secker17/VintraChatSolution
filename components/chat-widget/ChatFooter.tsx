'use client'

import { motion } from 'framer-motion'
import { Send, Paperclip, Image as ImageIcon, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WidgetSettings } from './types'

interface ChatFooterProps {
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  isSending?: boolean
  placeholder?: string
  className?: string
  settings?: {
    allowFileUpload?: boolean
    allowEmoji?: boolean
    soundEnabled?: boolean
  }
}

export function ChatFooter({ 
  inputValue,
  onInputChange,
  onSend,
  isSending = false,
  placeholder = "Type your message...",
  className,
  settings = {}
}: ChatFooterProps) {
  const { allowFileUpload = true, allowEmoji = true, soundEnabled = true } = settings

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className={cn(
      "shrink-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/50",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          {allowFileUpload && (
            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Paperclip className="h-4 w-4 text-slate-500" />
            </button>
          )}
          {allowEmoji && (
            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Smile className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>
        
        <div className="flex-1 relative">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full"
            disabled={isSending}
          />
          {allowEmoji && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Smile className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>
        
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onSend}
            disabled={!inputValue.trim() || isSending}
            size="sm"
            className="shrink-0"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
