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
  onReorder: (fromId: string, toId: string) => void
  headerColor?: string
  textColor?: string
}

interface ContextMenu {
  presetId: string
  x: number
  y: number
}

export function TabBar({ presets, activePresetId, onSelect, onSettings, onHide, onAdd, onEditPreset, onClearConversation, onDeletePreset, onReorder, headerColor, textColor }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dragIdRef = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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
      className="flex items-center select-none"
      style={{
        gap: 'var(--padding-xs)',
        padding: `var(--padding-sm) var(--padding)`,
        backgroundColor: headerColor,
        color: textColor,
      } as React.CSSProperties}
    >
      {presets.map((preset) => (
        <button
          key={preset.id}
          draggable
          onClick={() => onSelect(preset.id)}
          onContextMenu={(e) => handleContextMenu(e, preset.id)}
          onDragStart={() => { dragIdRef.current = preset.id }}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(preset.id) }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={() => {
            if (dragIdRef.current && dragIdRef.current !== preset.id) {
              onReorder(dragIdRef.current, preset.id)
            }
            dragIdRef.current = null
            setDragOverId(null)
          }}
          onDragEnd={() => { dragIdRef.current = null; setDragOverId(null) }}
          style={{ WebkitAppRegion: 'no-drag', padding: `var(--padding-sm) var(--padding)`, gap: 'var(--padding-xs)' } as React.CSSProperties}
          className={`flex items-center rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activePresetId === preset.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          } ${dragOverId === preset.id && dragIdRef.current !== preset.id ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
        >
          {preset.icon && <span>{preset.icon}</span>}
          {preset.name}
        </button>
      ))}

      <button
        onClick={onAdd}
        style={{ WebkitAppRegion: 'no-drag', padding: 'var(--padding-xs)' } as React.CSSProperties}
        className="rounded-lg text-gray-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-gray-600 transition-colors flex-shrink-0"
        title="Add preset"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <div style={{ flex: 1, alignSelf: 'stretch', WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div className="flex-shrink-0" style={{ gap: 'var(--padding-xs)', display: 'flex', alignItems: 'center', marginRight: 'var(--padding-xs)' }}>
        <button
          onClick={onSettings}
          style={{ WebkitAppRegion: 'no-drag', padding: 'var(--padding-xs)' } as React.CSSProperties}
          className="rounded-lg mr-0.5 text-gray-500 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          title="Settings"
        >
          <svg  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          onClick={onHide}
          style={{ WebkitAppRegion: 'no-drag', padding: 'var(--padding-xs)' } as React.CSSProperties}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          title="Hide"
        />
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y, padding: `var(--padding-xs) 0` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onEditPreset(contextMenu.presetId); setContextMenu(null) }}
            className="w-full text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-700"
            style={{ padding: 'var(--padding-sm) var(--padding)' }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => { onClearConversation(contextMenu.presetId); setContextMenu(null) }}
            className="w-full text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-700"
            style={{ padding: 'var(--padding-sm) var(--padding)' }}
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
