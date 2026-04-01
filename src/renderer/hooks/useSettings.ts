import { useState, useEffect } from 'react'
import type { AppSettings, Preset } from '../../shared/types'
import { loadSettings, saveSettings, loadPresets, savePresets } from '../lib/storage'
import { defaultPresets } from '../lib/presets'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }

  return { settings, updateSettings }
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(() => {
    return loadPresets() || defaultPresets
  })

  useEffect(() => {
    savePresets(presets)
  }, [presets])

  const addPreset = (preset: Preset) => {
    setPresets((prev) => [...prev, preset])
  }

  const updatePreset = (id: string, patch: Partial<Preset>) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }

  const removePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }

  const reorderPresets = (fromId: string, toId: string) => {
    setPresets((prev) => {
      const from = prev.findIndex((p) => p.id === fromId)
      const to = prev.findIndex((p) => p.id === toId)
      if (from === -1 || to === -1 || from === to) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  return { presets, addPreset, updatePreset, removePreset, reorderPresets, setPresets }
}
