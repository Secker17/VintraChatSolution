'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Paperclip, Image as ImageIcon, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatFooterProps {
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  isSending?: boolean
  placeholder?: string
  className?: string
}

export function ChatFooter({ 
  inputValue,
  onInputChange,
  onSend,
  isSending = false,
  placeholder = "Type your message...",
  className
}: ChatFooterProps) {
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
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
            <Paperclip className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
            <ImageIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 relative">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="pr-12 bg-slate-50/50 border-slate-200/50 focus:border-blue-400 focus:bg-white transition-all duration-200"
            disabled={isSending}
          />
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 absolute right-1 top-1/2 -translate-y-1/2">
            <Smile className="h-4 w-4" />
          </button>
        </div>
        
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onSend}
            disabled={!inputValue.trim() || isSending}
            size="sm"
            className="px-4 py-2 h-auto bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
