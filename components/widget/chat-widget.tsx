'use client'

// Re-export the new modular chat widget
export { ChatWidget, type ChatMessage, type ChatWidgetConfig, type WidgetSettings } from '../chat-widget/index'

// Legacy export for backward compatibility
export { ChatWidget as default } from '../chat-widget/ChatWidget'
