import React from 'react'
import type { AppSettings, LLMProvider } from '../../shared/types'
import { HotkeyInput } from './HotkeyInput'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onClose: () => void
  onEditPresets: () => void
}

export function Settings({ settings, onUpdate, onClose, onEditPresets }: Props) {
  const providers: { value: LLMProvider; label: string }[] = [
    { value: 'gemini', label: 'Gemini' },
    { value: 'claude', label: 'Claude (coming soon)' },
    { value: 'openai', label: 'OpenAI (coming soon)' },
  ]

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <h2 className="text-sm font-semibold dark:text-white">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-gray-500"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            AI Provider
          </label>
          <select
            value={settings.activeProvider}
            onChange={(e) => onUpdate({ activeProvider: e.target.value as LLMProvider })}
            className="w-full bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providers.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Keys */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Gemini API Key
          </label>
          <input
            type="password"
            value={settings.apiKeys.gemini}
            onChange={(e) =>
              onUpdate({
                apiKeys: { ...settings.apiKeys, gemini: e.target.value },
              })
            }
            placeholder="Enter your Gemini API key"
            className="w-full bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Claude API Key
          </label>
          <input
            type="password"
            value={settings.apiKeys.claude}
            onChange={(e) =>
              onUpdate({
                apiKeys: { ...settings.apiKeys, claude: e.target.value },
              })
            }
            placeholder="Enter your Claude API key"
            className="w-full bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={settings.apiKeys.openai}
            onChange={(e) =>
              onUpdate({
                apiKeys: { ...settings.apiKeys, openai: e.target.value },
              })
            }
            placeholder="Enter your OpenAI API key"
            className="w-full bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Hotkeys */}
        <HotkeyInput
          label="Toggle Window Hotkey"
          value={settings.hotkey}
          onChange={(accelerator) => {
            onUpdate({ hotkey: accelerator })
            // @ts-ignore
            if (window.require) {
              // @ts-ignore
              const { ipcRenderer } = window.require('electron')
              ipcRenderer.send('update-hotkey', 'toggle', accelerator)
            }
          }}
        />
        <HotkeyInput
          label="Send Selection Hotkey"
          value={settings.selectionHotkey}
          onChange={(accelerator) => {
            onUpdate({ selectionHotkey: accelerator })
            // @ts-ignore
            if (window.require) {
              // @ts-ignore
              const { ipcRenderer } = window.require('electron')
              ipcRenderer.send('update-hotkey', 'selection', accelerator)
            }
          }}
        />

        {/* Window Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Window Position
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ windowMode: 'cursor' })}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                settings.windowMode === 'cursor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              At Cursor
            </button>
            <button
              onClick={() => onUpdate({ windowMode: 'pinned' })}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                settings.windowMode === 'pinned'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Pinned
            </button>
          </div>
        </div>

        {/* Edit Presets */}
        <div>
          <button
            onClick={onEditPresets}
            className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm text-gray-600 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            Edit Preset Tabs
          </button>
        </div>
      </div>
    </div>
  )
}
