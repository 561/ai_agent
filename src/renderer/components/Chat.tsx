import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { ImagePreview } from './ImagePreview'
import type { ChatMessage, ImageAttachment, Conversation } from '../../shared/types'

interface Props {
  conversation: Conversation | null
  isStreaming: boolean
  streamingText: string
  onSend: (content: string, images: ImageAttachment[]) => void
  onStop: () => void
}

export function Chat({ conversation, isStreaming, streamingText, onSend, onStop }: Props) {
  const [input, setInput] = useState('')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingText])

  useEffect(() => {
    // Listen for selected text from main process
    const handleSelection = (_event: any, text: string) => {
      setInput((prev) => (prev ? prev + '\n' + text : text))
      textareaRef.current?.focus()
    }

    // @ts-ignore
    if (window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.on('selection-text', handleSelection)
      return () => {
        ipcRenderer.removeListener('selection-text', handleSelection)
      }
    }
  }, [])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed && images.length === 0) return
    if (isStreaming) return

    onSend(trimmed, images)
    setInput('')
    setImages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setImages((prev) => [
            ...prev,
            { data: base64, mimeType: item.type, name: file.name || 'pasted-image' },
          ])
        }
        reader.readAsDataURL(file)
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setImages((prev) => [
            ...prev,
            { data: base64, mimeType: file.type, name: file.name },
          ])
        }
        reader.readAsDataURL(file)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setImages((prev) => [
            ...prev,
            { data: base64, mimeType: file.type, name: file.name },
          ])
        }
        reader.readAsDataURL(file)
      }
    }
    e.target.value = ''
  }

  const messages = conversation?.messages || []

  return (
    <div
      className="flex flex-col h-full min-h-0"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Start typing to begin a conversation
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

      {/* Image preview */}
      <ImagePreview images={images} onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))} />

      {/* Input */}
      <div className="border-t border-surface-200 dark:border-surface-700 p-2">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            title="Attach image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type a message... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none bg-surface-100 dark:bg-surface-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white max-h-32 overflow-y-auto"
            style={{ minHeight: '36px' }}
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="Stop"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && images.length === 0}
              className="flex-shrink-0 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
