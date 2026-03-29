import React, { useState, useEffect, useRef } from 'react'
import type { Preset } from '../../shared/types'

interface Props {
  presets: Preset[]
  activePresetId: string
  onSelect: (presetId: string) => void
  onSettings: () => void
  onHide: () => void
  onAdd: () => void
  onEditPreset: (presetId: string) => void
  onClearConversation: (presetId: string) => void
  onDeletePreset: (presetId: string) => void
  headerColor?: string
  textColor?: string
}

interface ContextMenu {
  presetId: string
  x: number
  y: number
}

export function TabBar({ presets, activePresetId, onSelect, onSettings, onHide, onAdd, onEditPreset, onClearConversation, onDeletePreset, headerColor, textColor }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, presetId: string) => {
    e.preventDefault()
    setContextMenu({ presetId, x: e.clientX, y: e.clientY })
  }

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 select-none"
      style={{ backgroundColor: headerColor, color: textColor, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          onContextMenu={(e) => handleContextMenu(e, preset.id)}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
        onClick={onAdd}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="p-1 rounded-lg text-gray-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-gray-600 transition-colors flex-shrink-0"
        title="Add preset"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
        <button
          onClick={onSettings}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        <button
          onClick={onHide}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          title="Hide"
        />
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onEditPreset(contextMenu.presetId); setContextMenu(null) }}
            className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => { onClearConversation(contextMenu.presetId); setContextMenu(null) }}
            className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            🗑️ Clear chat
          </button>
          <button
            onClick={() => { onDeletePreset(contextMenu.presetId); setContextMenu(null) }}
            className="w-full px-3 py-1.5 text-xs text-left text-red-500 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            ❌ Delete tab
          </button>
        </div>
      )}
    </div>
  )
}
