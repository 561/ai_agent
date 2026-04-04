import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Preset, LLMProvider, PresetType } from '../../shared/types'
import { useI18n } from '../lib/i18n'

interface Props {
  presets: Preset[]
  onUpdate: (id: string, patch: Partial<Preset>) => void
  onAdd: (preset: Preset) => void
  onRemove: (id: string) => void
  onClose: () => void
  initialEditingId?: string | null
}

export function PresetEditor({ presets, onUpdate, onAdd, onRemove, onClose, initialEditingId }: Props) {
  const { t } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(initialEditingId || null)

  const providers: { value: LLMProvider; label: string }[] = [
    { value: 'gemini', label: 'Gemini' },
    { value: 'claude', label: 'Claude' },
    { value: 'openai', label: 'OpenAI' },
  ]

  const geminiModels = [
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Recommended)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Thinking)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Thinking, Best)' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview' },
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
  ]

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-700" style={{ padding: `var(--padding-sm) var(--padding-lg)` }}>
        <h2 className="text-sm font-semibold dark:text-white">{t('editPresets')}</h2>
        <button
          onClick={onClose}
          className="rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-gray-500"
          style={{ padding: 'var(--padding-xs)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--padding-lg)', gap: 'var(--padding)', display: 'flex', flexDirection: 'column' }}>
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-xl"
            style={{ padding: 'var(--padding)', backgroundColor: 'var(--header)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
          >
            {editingId === preset.id ? (
              <div style={{ gap: 'var(--padding-sm)', display: 'flex', flexDirection: 'column' }}>
                <div className="flex" style={{ gap: 'var(--gap)' }}>
                  <input
                    value={preset.icon || ''}
                    onChange={(e) => onUpdate(preset.id, { icon: e.target.value })}
                    className="w-12 rounded-lg text-sm text-center outline-none"
                    style={{ padding: 'var(--padding-sm) var(--padding-xs)', backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="Icon"
                  />
                  <input
                    value={preset.name}
                    onChange={(e) => onUpdate(preset.id, { name: e.target.value })}
                    className="flex-1 rounded-lg text-sm outline-none"
                    style={{ padding: 'var(--padding-sm) var(--padding)', backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('tabType')}
                  </label>
                  <select
                    value={preset.type || 'chat'}
                    onChange={(e) => onUpdate(preset.id, { type: e.target.value as PresetType })}
                    className="w-full rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ padding: 'var(--padding-sm)', backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="chat">{t('chat')}</option>
                    <option value="agent">{t('agentBrowser')}</option>
                  </select>
                </div>

                <textarea
                  value={preset.systemInstruction}
                  onChange={(e) => onUpdate(preset.id, { systemInstruction: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg text-sm outline-none resize-none"
                  style={{ padding: 'var(--padding)', backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder={preset.type === 'agent' ? t('agentInstructions') : t('systemInstruction')}
                />

                {/* Telegram notify — agent presets only */}
                {preset.type === 'agent' && (
                  <div className="flex items-center justify-between rounded-lg" style={{ padding: 'var(--padding-sm) var(--padding)', backgroundColor: 'var(--bg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--text)' }}>{t('sendResultToTelegram')}</div>
                      <div className="text-xs text-gray-500">{t('telegramNotifyHint')}</div>
                    </div>
                    <button
                      onClick={() => onUpdate(preset.id, { telegramNotify: !preset.telegramNotify })}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-2"
                      style={{ backgroundColor: preset.telegramNotify ? 'var(--accent, #2563eb)' : 'rgba(255,255,255,0.15)' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                        style={{ left: preset.telegramNotify ? '22px' : '2px' }}
                      />
                    </button>
                  </div>
                )}

                {/* AI Provider & Model Overrides */}
                <div style={{ gap: 'var(--padding-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('aiProviderDefault')}
                    </label>
                    <select
                      value={preset.llmProvider || ''}
                      onChange={(e) => onUpdate(preset.id, { llmProvider: (e.target.value as LLMProvider) || undefined })}
                      className="w-full rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ padding: 'var(--padding-sm)', backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="">{t('useGlobalDefault')}</option>
                      {providers.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('aiModelDefault')}
                    </label>
                    <select
                      value={preset.llmModel || ''}
                      onChange={(e) => onUpdate(preset.id, { llmModel: e.target.value || undefined })}
                      className="w-full rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ padding: 'var(--padding-sm)', backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="">{t('useGlobalDefault')}</option>
                      {geminiModels.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between" style={{ gap: 'var(--gap)' }}>
                  <button
                    onClick={() => onRemove(preset.id)}
                    className="rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{ padding: 'var(--padding-xs) var(--padding)' }}
                  >
                    {t('delete')}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
                    style={{ padding: 'var(--padding-xs) var(--padding)' }}
                  >
                    {t('done')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center" style={{ gap: 'var(--gap)' }}>
                <div
                  className="flex items-center flex-1 cursor-pointer"
                  style={{ gap: 'var(--gap)' }}
                  onClick={() => setEditingId(preset.id)}
                >
                  <span>{preset.icon}</span>
                  <span className="text-sm dark:text-white">{preset.name}</span>
                  <span className="ml-auto text-sm rounded" style={{ backgroundColor: 'var(--header)', opacity: 0.7, padding: `var(--padding-xs) var(--padding-sm)` }}>edit</span>
                </div>
                <button
                  onClick={() => onRemove(preset.id)}
                  className="rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                  style={{ padding: 'var(--padding-xs)' }}
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleAdd}
          className="w-full rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
          style={{ padding: `var(--padding-sm) 0` }}
        >
          {t('addPresetBtn')}
        </button>
      </div>
    </div>
  )
}
