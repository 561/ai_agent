import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Preset } from '../../shared/types'

interface Props {
  presets: Preset[]
  onUpdate: (id: string, patch: Partial<Preset>) => void
  onAdd: (preset: Preset) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export function PresetEditor({ presets, onUpdate, onAdd, onRemove, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = () => {
    const newPreset: Preset = {
      id: uuidv4(),
      name: 'New Preset',
      systemInstruction: 'You are a helpful assistant.',
      icon: '🤖',
    }
    onAdd(newPreset)
    setEditingId(newPreset.id)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <h2 className="text-sm font-semibold dark:text-white">Edit Presets</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-gray-500"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="bg-surface-100 dark:bg-surface-800 rounded-xl p-3"
          >
            {editingId === preset.id ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={preset.icon || ''}
                    onChange={(e) => onUpdate(preset.id, { icon: e.target.value })}
                    className="w-12 bg-white dark:bg-surface-700 rounded-lg px-2 py-1.5 text-sm text-center outline-none"
                    placeholder="Icon"
                  />
                  <input
                    value={preset.name}
                    onChange={(e) => onUpdate(preset.id, { name: e.target.value })}
                    className="flex-1 bg-white dark:bg-surface-700 rounded-lg px-3 py-1.5 text-sm dark:text-white outline-none"
                    placeholder="Name"
                  />
                </div>
                <textarea
                  value={preset.systemInstruction}
                  onChange={(e) => onUpdate(preset.id, { systemInstruction: e.target.value })}
                  rows={4}
                  className="w-full bg-white dark:bg-surface-700 rounded-lg px-3 py-2 text-xs dark:text-white outline-none resize-none"
                  placeholder="System instruction..."
                />
                <div className="flex justify-between">
                  <button
                    onClick={() => onRemove(preset.id)}
                    className="px-3 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setEditingId(preset.id)}
              >
                <span>{preset.icon}</span>
                <span className="text-sm dark:text-white">{preset.name}</span>
                <span className="ml-auto text-xs text-gray-400">edit</span>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleAdd}
          className="w-full py-2 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
        >
          + Add Preset
        </button>
      </div>
    </div>
  )
}
