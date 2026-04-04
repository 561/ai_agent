import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TabBar } from './components/TabBar'
import { Chat } from './components/Chat'
import { AgentView } from './components/AgentView'
import { Settings } from './components/Settings'
import { PresetEditor } from './components/PresetEditor'
import { useSettings, usePresets } from './hooks/useSettings'
import { useChat } from './hooks/useChat'
import { useAgentChat } from './hooks/useAgentChat'
import { I18nContext, getTranslator } from './lib/i18n'

type View = 'chat' | 'settings' | 'presets'

export function App() {
  const { settings, updateSettings } = useSettings()
  const { presets, addPreset, updatePreset, removePreset, reorderPresets } = usePresets()
  const [activePresetId, setActivePresetId] = useState(presets[0]?.id || 'general')
  const [view, setView] = useState<View>('chat')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [chatFocusSignal, setChatFocusSignal] = useState(0)

  // Refs to avoid stale closures in event handlers
  const presetsRef = useRef(presets)
  presetsRef.current = presets
  const activePresetIdRef = useRef(activePresetId)
  activePresetIdRef.current = activePresetId
  const viewRef = useRef(view)
  viewRef.current = view

  const triggerChatFocus = useCallback(() => setChatFocusSignal((s) => s + 1), [])

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    startConversation,
    sendMessage,
    isStreaming,
    streamingText,
    stopStreaming,
    clearConversation,
  } = useChat(settings, presets)

  const {
    conversations: agentConversations,
    activeConversation: activeAgentConversation,
    activeConversationId: activeAgentConversationId,
    setActiveConversationId: setActiveAgentConversationId,
    startConversation: startAgentConversation,
    sendTask,
    respondToAgent,
    isRunning: isAgentRunning,
    isWaitingForUser,
    statusText: agentStatusText,
    stopAgent,
    clearConversation: clearAgentConversation,
  } = useAgentChat(settings, presets)

  // Apply accent color and font size as CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', settings.accentColor || '#2563eb')
    root.style.setProperty('--bg', settings.bgColor || '#1e293b')
    root.style.setProperty('--header', settings.headerColor || '#0f172a')
    root.style.setProperty('--text', settings.textColor || '#e2e8f0')
    const sizeMap = { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' }
    const fontSize = sizeMap[settings.fontSize || 'md']
    root.style.setProperty('--font-size', fontSize)

    // Scale padding and margins based on font size
    const baseFontSize = 16
    const currentSize = parseInt(fontSize)
    const scale = currentSize / baseFontSize
    root.style.setProperty('--padding-xs', `${4 * scale}px`)
    root.style.setProperty('--padding-sm', `${6 * scale}px`)
    root.style.setProperty('--padding', `${8 * scale}px`)
    root.style.setProperty('--padding-lg', `${12 * scale}px`)
    root.style.setProperty('--gap', `${8 * scale}px`)
  }, [settings.accentColor, settings.bgColor, settings.headerColor, settings.textColor, settings.fontSize])

  // Listen for open-settings from main process & sync hotkeys on mount
  useEffect(() => {
    // @ts-ignore
    if (window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.on('open-settings', () => setView('settings'))

      ipcRenderer.on('global-wheel-tab-switch', (_: any, direction: 'left' | 'right') => {
        if (viewRef.current !== 'chat') return
        const ps = presetsRef.current
        const currentIndex = ps.findIndex((p) => p.id === activePresetIdRef.current)
        if (currentIndex === -1 || ps.length <= 1) return
        const nextIndex =
          direction === 'right'
            ? (currentIndex + 1) % ps.length
            : (currentIndex - 1 + ps.length) % ps.length
        handlePresetSelectRef.current(ps[nextIndex].id)
        triggerChatFocus()
      })

      // Sync saved hotkey to main process on startup
      if (settings.hotkey) {
        ipcRenderer.send('update-hotkey', settings.hotkey)
      }

      // Sync window mode to main process on startup
      ipcRenderer.send('update-window-mode', settings.windowMode || 'cursor')

      // ESC to hide window; Ctrl+Shift+Arrow to switch tabs
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          ipcRenderer.send('hide-window')
          return
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          if (viewRef.current !== 'chat') return
          e.preventDefault()
          const ps = presetsRef.current
          const currentIndex = ps.findIndex((p) => p.id === activePresetIdRef.current)
          if (currentIndex === -1 || ps.length <= 1) return
          const nextIndex =
            e.key === 'ArrowRight'
              ? (currentIndex + 1) % ps.length
              : (currentIndex - 1 + ps.length) % ps.length
          handlePresetSelectRef.current(ps[nextIndex].id)
          triggerChatFocus()
        }
      }
      window.addEventListener('keydown', handleKeyDown)

      // Focus chat input when window regains focus
      const handleWindowFocus = () => {
        if (viewRef.current === 'chat') triggerChatFocus()
      }
      window.addEventListener('focus', handleWindowFocus)

      // Ctrl+Shift+Wheel to switch tabs
      const handleWheel = (e: WheelEvent) => {
        if (!e.ctrlKey || !e.shiftKey) return
        if (viewRef.current !== 'chat') return
        e.preventDefault()
        const ps = presetsRef.current
        const currentIndex = ps.findIndex((p) => p.id === activePresetIdRef.current)
        if (currentIndex === -1 || ps.length <= 1) return
        const nextIndex =
          e.deltaY > 0
            ? (currentIndex + 1) % ps.length
            : (currentIndex - 1 + ps.length) % ps.length
        handlePresetSelectRef.current(ps[nextIndex].id)
        triggerChatFocus()
      }
      window.addEventListener('wheel', handleWheel, { passive: false })

      return () => {
        ipcRenderer.removeAllListeners('open-settings')
        ipcRenderer.removeAllListeners('global-wheel-tab-switch')
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('focus', handleWindowFocus)
        window.removeEventListener('wheel', handleWheel)
      }
    }
  }, [])

  const language = settings.language || 'en'
  const i18nValue = useMemo(() => ({
    t: getTranslator(language),
    language,
  }), [language])

  const activePreset = presets.find((p) => p.id === activePresetId) || null

  const handlePresetSelectRef = useRef<(id: string) => void>(() => {})

  const resizeForPreset = (presetId: string) => {
    // @ts-ignore
    if (window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron')
      const preset = presetsRef.current.find((p) => p.id === presetId)
      if (preset?.type === 'agent') {
        ipcRenderer.send('set-window-size', 900, 750)
      } else {
        ipcRenderer.send('set-window-size', 480, 640)
      }
    }
  }

  const handlePresetSelect = (presetId: string) => {
    setActivePresetId(presetId)
    resizeForPreset(presetId)

    const preset = presetsRef.current.find((p) => p.id === presetId)
    if (preset?.type === 'agent') {
      const existing = agentConversations.find((c) => c.presetId === presetId)
      if (existing) {
        setActiveAgentConversationId(existing.id)
      } else {
        startAgentConversation(presetId)
      }
    } else {
      const existing = conversations.find((c) => c.presetId === presetId)
      if (existing) {
        setActiveConversationId(existing.id)
      } else {
        startConversation(presetId)
      }
    }
  }
  handlePresetSelectRef.current = handlePresetSelect

  const handleSend = (content: string, images: any[]) => {
    const preset = presets.find((p) => p.id === activePresetId)
    const systemInstruction = preset?.systemInstruction || ''

    let convId = activeConversationId
    if (!convId) {
      convId = startConversation(activePresetId)
    }

    sendMessage(content, images, systemInstruction, convId)
  }

  const handleAgentSend = (content: string) => {
    let convId = activeAgentConversationId
    if (!convId) {
      convId = startAgentConversation(activePresetId)
    }
    sendTask(content, convId)
  }

  useEffect(() => {
    if (activeConversation) {
      console.log(`[tab: ${activeConversation.presetId}]`, activeConversation.messages)
    }
  }, [activeConversationId])

  // Sync windowMode changes to main process
  useEffect(() => {
    // @ts-ignore
    if (window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('update-window-mode', settings.windowMode || 'cursor')
    }
  }, [settings.windowMode])

  // Auto-select first preset on mount
  useEffect(() => {
    if (presets.length > 0 && !activeConversationId) {
      handlePresetSelect(presets[0].id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddPreset = () => {
    const newPreset = { id: uuidv4(), name: 'New Preset', systemInstruction: 'You are a helpful assistant.', icon: '🤖' }
    addPreset(newPreset)
    setEditingPresetId(newPreset.id)
    setView('presets')
  }

  const handleEditPreset = (presetId: string) => {
    setEditingPresetId(presetId)
    setView('presets')
  }

  const handleClearConversation = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (preset?.type === 'agent') {
      const conv = agentConversations.find((c) => c.presetId === presetId)
      if (conv) clearAgentConversation(conv.id)
    } else {
      const conv = conversations.find((c) => c.presetId === presetId)
      if (conv) clearConversation(conv.id)
    }
  }

  const handleDeletePreset = (presetId: string) => {
    removePreset(presetId)
    if (activePresetId === presetId && presets.length > 1) {
      const next = presets.find((p) => p.id !== presetId)
      if (next) handlePresetSelect(next.id)
    }
  }

  const handleHide = () => {
    // @ts-ignore
    if (window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('hide-window')
    }
  }

  return (
    <I18nContext.Provider value={i18nValue}>
    <div
      className="flex flex-col h-screen rounded-2xl overflow-hidden shadow-2xl border border-surface-200 dark:border-surface-700"
      style={{ backgroundColor: settings.bgColor || '#1e293b' }}
    >
      {/* Fixed header: tabs + controls */}
      <div className="flex-shrink-0 border-b border-surface-200 dark:border-surface-700">
        {view === 'chat' ? (
          <TabBar
            presets={presets}
            activePresetId={activePresetId}
            onSelect={handlePresetSelect}
            onSettings={() => setView('settings')}
            onHide={handleHide}
            onAdd={handleAddPreset}
            onEditPreset={handleEditPreset}
            onClearConversation={handleClearConversation}
            onDeletePreset={handleDeletePreset}
            onReorder={reorderPresets}
            headerColor={settings.headerColor || '#0f172a'}
            textColor={settings.textColor || '#e2e8f0'}
          />
        ) : (
          <div
            className="flex items-center justify-between select-none"
            style={{ backgroundColor: settings.headerColor || '#0f172a', color: settings.textColor || '#e2e8f0', WebkitAppRegion: 'drag', padding: `var(--padding-sm) var(--padding)` } as React.CSSProperties}
          >
            <span className="text-xs font-semibold opacity-60">
              {view === 'settings' ? i18nValue.t('settings') : i18nValue.t('presets')}
            </span>
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <button onClick={handleHide} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600" title="Hide" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {view === 'settings' ? (
          <Settings
            settings={settings}
            onUpdate={updateSettings}
            onClose={() => { setView('chat'); triggerChatFocus() }}
            onEditPresets={() => setView('presets')}
          />
        ) : view === 'presets' ? (
          <PresetEditor
            presets={presets}
            onUpdate={updatePreset}
            onAdd={addPreset}
            onRemove={removePreset}
            initialEditingId={editingPresetId}
            onClose={() => { setView('chat'); setEditingPresetId(null); triggerChatFocus() }}
          />
        ) : activePreset?.type === 'agent' ? (
          <AgentView
            conversation={activeAgentConversation}
            isRunning={isAgentRunning}
            isWaitingForUser={isWaitingForUser}
            statusText={agentStatusText}
            onSendTask={handleAgentSend}
            onRespondToAgent={(answer) => respondToAgent(answer, activeAgentConversationId!)}
            onStop={stopAgent}
            focusSignal={chatFocusSignal}
            preset={activePreset}
          />
        ) : (
          <Chat
            conversation={activeConversation}
            isStreaming={isStreaming}
            streamingText={streamingText}
            onSend={handleSend}
            onStop={stopStreaming}
            groqApiKey={settings.apiKeys.groq}
            focusSignal={chatFocusSignal}
          />
        )}
      </div>
    </div>
    </I18nContext.Provider>
  )
}
