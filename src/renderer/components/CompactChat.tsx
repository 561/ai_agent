import React, { useState, useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Conversation, ImageAttachment } from '../../shared/types'

interface Props {
  conversation: Conversation | null
  isStreaming: boolean
  streamingText: string
  onSend: (content: string, images: ImageAttachment[]) => void
  onStop: () => void
  focusSignal?: number
}

export function CompactChat({ conversation, isStreaming, streamingText, onSend, onStop, focusSignal }: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingText])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [focusSignal])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed, [])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const messages = conversation?.messages || []

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--padding-sm)' }}>
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
            Send a message to the agent...
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && streamingText && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingText,
              timestamp: Date.now(),
            }}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-200 dark:border-surface-700 flex-shrink-0" style={{ padding: 'var(--padding-xs)' }}>
        <div className="flex items-end" style={{ gap: 'var(--padding-xs)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message agent..."
            rows={1}
            className="flex-1 resize-none bg-surface-100 dark:bg-surface-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-white max-h-20 overflow-y-auto"
            style={{ minHeight: '30px', padding: 'var(--padding-sm) var(--padding)' }}
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              style={{ padding: 'var(--padding-sm)' }}
              title="Stop"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex-shrink-0 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ padding: 'var(--padding-sm)' }}
              title="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
