import React, { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserToolbar } from './BrowserToolbar'
import { CompactChat } from './CompactChat'
import type { Conversation, ImageAttachment, AgentState, Preset } from '../../shared/types'

interface Props {
  conversation: Conversation | null
  isStreaming: boolean
  streamingText: string
  onSend: (content: string, images: ImageAttachment[]) => void
  onStop: () => void
  focusSignal?: number
  preset: Preset
}

export function AgentView({ conversation, isStreaming, streamingText, onSend, onStop, focusSignal }: Props) {
  const webviewRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chatHeight, setChatHeight] = useState(200) // px, not %
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startY = e.clientY
    const startHeight = chatHeight

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY
      const newHeight = startHeight + delta
      const container = containerRef.current
      if (!container) return
      const maxHeight = container.clientHeight * 0.7
      const minHeight = 100
      setChatHeight(Math.min(maxHeight, Math.max(minHeight, newHeight)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [chatHeight])

  const [agentState, setAgentState] = useState<AgentState>({
    currentUrl: 'https://www.google.com',
    pageTitle: '',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  })
  const [urlInput, setUrlInput] = useState('https://www.google.com')

  useEffect(() => {
    const wv = webviewRef.current as any
    if (!wv) return

    const onReady = () => {
      wv.addEventListener('did-navigate', (e: any) => {
        setAgentState((prev: AgentState) => ({
          ...prev,
          currentUrl: e.url,
          canGoBack: wv.canGoBack(),
          canGoForward: wv.canGoForward(),
        }))
        setUrlInput(e.url)
      })

      wv.addEventListener('did-navigate-in-page', (e: any) => {
        setAgentState((prev: AgentState) => ({
          ...prev,
          currentUrl: e.url,
          canGoBack: wv.canGoBack(),
          canGoForward: wv.canGoForward(),
        }))
        setUrlInput(e.url)
      })

      wv.addEventListener('page-title-updated', (e: any) => {
        setAgentState((prev: AgentState) => ({ ...prev, pageTitle: e.title }))
      })

      wv.addEventListener('did-start-loading', () => {
        setAgentState((prev: AgentState) => ({ ...prev, isLoading: true }))
      })

      wv.addEventListener('did-stop-loading', () => {
        setAgentState((prev: AgentState) => ({
          ...prev,
          isLoading: false,
          canGoBack: wv.canGoBack(),
          canGoForward: wv.canGoForward(),
        }))
      })
    }

    wv.addEventListener('dom-ready', onReady)
    return () => {
      wv.removeEventListener('dom-ready', onReady)
    }
  }, [])

  const handleNavigate = (url: string) => {
    const wv = webviewRef.current as any
    if (wv) wv.loadURL(url)
  }

  const handleBack = () => {
    const wv = webviewRef.current as any
    if (wv?.canGoBack()) wv.goBack()
  }

  const handleForward = () => {
    const wv = webviewRef.current as any
    if (wv?.canGoForward()) wv.goForward()
  }

  const handleRefresh = () => {
    const wv = webviewRef.current as any
    if (wv) {
      if (agentState.isLoading) wv.stop()
      else wv.reload()
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full min-h-0" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Browser toolbar */}
      <BrowserToolbar
        agentState={agentState}
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
      />

      {/* Webview — fills all remaining space */}
      <div className="flex-1 min-h-0 relative">
        <webview
          ref={webviewRef as any}
          src={agentState.currentUrl}
          style={{ width: '100%', height: '100%' }}
          allowpopups="true"
        />
        {/* Transparent overlay blocks webview from stealing mouse events during drag */}
        {isDragging && (
          <div className="absolute inset-0" style={{ zIndex: 10 }} />
        )}
      </div>

      {/* Draggable resize handle */}
      <div
        onMouseDown={handleDragStart}
        className="flex-shrink-0 flex items-center justify-center cursor-row-resize group hover:bg-blue-500/20 transition-colors"
        style={{ height: '6px' }}
      >
        <div className="w-8 h-1 rounded-full bg-surface-600 group-hover:bg-blue-400 transition-colors" />
      </div>

      {/* Compact chat — fixed px height, resizable via handle */}
      <div className="flex-shrink-0 min-h-0" style={{ height: `${chatHeight}px` }}>
        <CompactChat
          conversation={conversation}
          isStreaming={isStreaming}
          streamingText={streamingText}
          onSend={onSend}
          onStop={onStop}
          focusSignal={focusSignal}
        />
      </div>
    </div>
  )
}
