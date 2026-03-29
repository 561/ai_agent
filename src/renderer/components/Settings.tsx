import React, { useRef } from 'react'
import type { AppSettings, LLMProvider } from '../../shared/types'
import { HotkeyInput } from './HotkeyInput'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onClose: () => void
  onEditPresets: () => void
}

const EyedropperIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 22l4-4M14.5 2.5l7 7-9 9-7-7 9-9z" />
    <path d="M6 18l-4 4M17 6l1-1" />
  </svg>
)

export function Settings({ settings, onUpdate, onClose, onEditPresets }: Props) {
  const accentPickerRef = useRef<HTMLInputElement>(null)
  const bgPickerRef = useRef<HTMLInputElement>(null)
  const headerPickerRef = useRef<HTMLInputElement>(null)
  const textPickerRef = useRef<HTMLInputElement>(null)
  const providers: { value: LLMProvider; label: string }[] = [
    { value: 'gemini', label: 'Gemini' },
    { value: 'claude', label: 'Claude (coming soon)' },
    { value: 'openai', label: 'OpenAI (coming soon)' },
  ]

  return (
    <div className="flex flex-col h-full">
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

        {/* Accent Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Accent Color
          </label>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { color: '#2563eb', label: 'Blue' },
              { color: '#7c3aed', label: 'Purple' },
              { color: '#059669', label: 'Green' },
              { color: '#dc2626', label: 'Red' },
              { color: '#d97706', label: 'Orange' },
              { color: '#db2777', label: 'Pink' },
              { color: '#0891b2', label: 'Cyan' },
              { color: '#64748b', label: 'Gray' },
            ].map(({ color, label }) => (
              <button
                key={color}
                onClick={() => onUpdate({ accentColor: color })}
                title={label}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: color,
                  outline: settings.accentColor === color ? `3px solid ${color}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
            <div className="relative flex-shrink-0">
              <input
                ref={accentPickerRef}
                type="color"
                value={settings.accentColor}
                onChange={(e) => onUpdate({ accentColor: e.target.value })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <button
                onClick={() => accentPickerRef.current?.click()}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-200 dark:bg-surface-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Custom color"
              >
                <EyedropperIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Background Color
          </label>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { color: '#1e293b', label: 'Dark Blue' },
              { color: '#18181b', label: 'Dark' },
              { color: '#1c1917', label: 'Dark Brown' },
              { color: '#14532d', label: 'Dark Green' },
              { color: '#1e1b4b', label: 'Dark Purple' },
              { color: '#ffffff', label: 'White' },
              { color: '#f8fafc', label: 'Light' },
              { color: '#fef3c7', label: 'Warm' },
            ].map(({ color, label }) => (
              <button
                key={color}
                onClick={() => onUpdate({ bgColor: color })}
                title={label}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0 border border-surface-300 dark:border-surface-600"
                style={{
                  backgroundColor: color,
                  outline: settings.bgColor === color ? `3px solid var(--accent)` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
            <div className="relative flex-shrink-0">
              <input
                ref={bgPickerRef}
                type="color"
                value={settings.bgColor}
                onChange={(e) => onUpdate({ bgColor: e.target.value })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <button
                onClick={() => bgPickerRef.current?.click()}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-200 dark:bg-surface-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Custom background"
              >
                <EyedropperIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Surface Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Surface Color (panels, inputs, buttons)
          </label>
          <div className="flex gap-2 flex-wrap items-center">
            {['#0f172a','#1e293b','#18181b','#1c1917','#1e1b4b','#064e3b','#ffffff','#f1f5f9'].map((color) => (
              <button
                key={color}
                onClick={() => onUpdate({ headerColor: color })}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0 border border-surface-300 dark:border-surface-600"
                style={{
                  backgroundColor: color,
                  outline: settings.headerColor === color ? `3px solid var(--accent)` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
            <div className="relative flex-shrink-0">
              <input ref={headerPickerRef} type="color" value={settings.headerColor} onChange={(e) => onUpdate({ headerColor: e.target.value })} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
              <button onClick={() => headerPickerRef.current?.click()} className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-200 dark:bg-surface-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Custom color">
                <EyedropperIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Text Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Text Color
          </label>
          <div className="flex gap-2 flex-wrap items-center">
            {['#e2e8f0','#f8fafc','#ffffff','#cbd5e1','#94a3b8','#1e293b','#0f172a','#374151'].map((color) => (
              <button
                key={color}
                onClick={() => onUpdate({ textColor: color })}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0 border border-surface-300 dark:border-surface-600"
                style={{
                  backgroundColor: color,
                  outline: settings.textColor === color ? `3px solid var(--accent)` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
            <div className="relative flex-shrink-0">
              <input ref={textPickerRef} type="color" value={settings.textColor} onChange={(e) => onUpdate({ textColor: e.target.value })} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
              <button onClick={() => textPickerRef.current?.click()} className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-200 dark:bg-surface-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Custom color">
                <EyedropperIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Font Size
          </label>
          <div className="flex gap-2">
            {([['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onUpdate({ fontSize: value })}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  settings.fontSize === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
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
