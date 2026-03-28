import React from 'react'
import type { Preset } from '../../shared/types'

interface Props {
  presets: Preset[]
  activePresetId: string
  onSelect: (presetId: string) => void
  onSettings: () => void
}

export function TabBar({ presets, activePresetId, onSelect, onSettings }: Props) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 overflow-x-auto">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activePresetId === preset.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
        >
          {preset.icon && <span>{preset.icon}</span>}
          {preset.name}
        </button>
      ))}
      <button
        onClick={onSettings}
        className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    </div>
  )
}
