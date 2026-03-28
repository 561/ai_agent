import React, { useState, useEffect } from 'react'
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
  } = useChat(settings)

  // Listen for open-settings from main process & sync hotkeys on mount
  useEffect(() => {
    // @ts-ignore
    if (window.require) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.on('open-settings', () => setView('settings'))

      // Sync saved hotkeys to main process on startup
      if (settings.hotkey) {
        ipcRenderer.send('update-hotkey', 'toggle', settings.hotkey)
      }
      if (settings.selectionHotkey) {
        ipcRenderer.send('update-hotkey', 'selection', settings.selectionHotkey)
      }

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

  // Auto-select first preset on mount
  useEffect(() => {
    if (presets.length > 0 && !activeConversationId) {
      handlePresetSelect(presets[0].id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-surface-900 rounded-2xl overflow-hidden shadow-2xl border border-surface-200 dark:border-surface-700">
      {/* Title bar (draggable) */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-surface-100 dark:bg-surface-800 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          AI Agent
        </span>
        <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => {
              // @ts-ignore
              if (window.require) {
                // @ts-ignore
                const { ipcRenderer } = window.require('electron')
                ipcRenderer.send('hide-window')
              }
            }}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600"
            title="Hide"
          />
        </div>
      </div>

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
          onClose={() => setView('chat')}
        />
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
            <TabBar
              presets={presets}
              activePresetId={activePresetId}
              onSelect={handlePresetSelect}
              onSettings={() => setView('settings')}
            />
          </div>
          <Chat
            conversation={activeConversation}
            isStreaming={isStreaming}
            streamingText={streamingText}
            onSend={handleSend}
            onStop={stopStreaming}
          />
        </>
      )}
    </div>
  )
}
