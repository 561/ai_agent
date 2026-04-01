import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TabBar } from './components/TabBar'
import { Chat } from './components/Chat'
import { Settings } from './components/Settings'
import { PresetEditor } from './components/PresetEditor'
import { useSettings, usePresets } from './hooks/useSettings'
import { useChat } from './hooks/useChat'

type View = 'chat' | 'settings' | 'presets'

export function App() {
  const { settings, updateSettings } = useSettings()
  const { presets, addPreset, updatePreset, removePreset } = usePresets()
  const [activePresetId, setActivePresetId] = useState(presets[0]?.id || 'general')
  const [view, setView] = useState<View>('chat')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)

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

      // Sync saved hotkey to main process on startup
      if (settings.hotkey) {
        ipcRenderer.send('update-hotkey', settings.hotkey)
      }

      // Sync window mode to main process on startup
      ipcRenderer.send('update-window-mode', settings.windowMode || 'cursor')

      // ESC to hide window
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          ipcRenderer.send('hide-window')
        }
      }
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        ipcRenderer.removeAllListeners('open-settings')
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [])

  const handlePresetSelect = (presetId: string) => {
    setActivePresetId(presetId)
    // Find or create conversation for this preset
    const existing = conversations.find((c) => c.presetId === presetId)
    if (existing) {
      setActiveConversationId(existing.id)
    } else {
      startConversation(presetId)
    }
  }

  const handleSend = (content: string, images: any[]) => {
    const preset = presets.find((p) => p.id === activePresetId)
    const systemInstruction = preset?.systemInstruction || ''

    let convId = activeConversationId
    if (!convId) {
      convId = startConversation(activePresetId)
    }

    sendMessage(content, images, systemInstruction, convId)
  }

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
    const conv = conversations.find((c) => c.presetId === presetId)
    if (conv) clearConversation(conv.id)
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
            headerColor={settings.headerColor || '#0f172a'}
            textColor={settings.textColor || '#e2e8f0'}
          />
        ) : (
          <div
            className="flex items-center justify-between select-none"
            style={{ backgroundColor: settings.headerColor || '#0f172a', color: settings.textColor || '#e2e8f0', WebkitAppRegion: 'drag', padding: `var(--padding-sm) var(--padding)` } as React.CSSProperties}
          >
            <span className="text-xs font-semibold opacity-60">
              {view === 'settings' ? 'Settings' : 'Presets'}
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
            onClose={() => setView('chat')}
            onEditPresets={() => setView('presets')}
          />
        ) : view === 'presets' ? (
          <PresetEditor
            presets={presets}
            onUpdate={updatePreset}
            onAdd={addPreset}
            onRemove={removePreset}
            initialEditingId={editingPresetId}
            onClose={() => { setView('chat'); setEditingPresetId(null) }}
          />
        ) : (
          <Chat
            conversation={activeConversation}
            isStreaming={isStreaming}
            streamingText={streamingText}
            onSend={handleSend}
            onStop={stopStreaming}
            groqApiKey={settings.apiKeys.groq}
          />
        )}
      </div>
    </div>
  )
}
