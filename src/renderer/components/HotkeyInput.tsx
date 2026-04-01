import React, { useState, useRef } from 'react'

interface Props {
  value: string
  onChange: (accelerator: string) => void
  label: string
}

// Convert e.code to Electron accelerator key name (always ASCII, layout-independent)
function codeToAccelKey(code: string): string | null {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  const map: Record<string, string> = {
    Space: 'Space', Tab: 'Tab', Escape: 'Escape', Enter: 'Return',
    Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
    F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',',
    Period: '.', Slash: '/', Backquote: '`',
  }
  return map[code] || null
}

function buildAccelerator(e: React.KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Super')
  const key = codeToAccelKey(e.code)
  if (!key) return null
  parts.push(key)
  return parts.join('+')
}

function acceleratorToDisplay(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/Super/g, 'Super')
}

export function HotkeyInput({ value, onChange, label }: Props) {
  const [recording, setRecording] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [displayKeys, setDisplayKeys] = useState<string[]>([])
  const inputRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()

    const modifiers: string[] = []
    if (e.ctrlKey) modifiers.push('Ctrl')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')
    if (e.metaKey) modifiers.push('Super')

    const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)
    if (!isModifierOnly) {
      const accelerator = buildAccelerator(e)
      if (accelerator) {
        const mainKey = codeToAccelKey(e.code)
        if (mainKey) modifiers.push(mainKey)
        setRecording(false)
        setDisplayKeys([])
        onChange(accelerator)
      }
    } else {
      setDisplayKeys(modifiers)
    }
  }

  const handleKeyUp = () => {
    if (recording) setDisplayKeys([])
  }

  const startRecording = () => {
    setRecording(true)
    setManualMode(false)
    setDisplayKeys([])
    inputRef.current?.focus()
  }

  const submitManual = () => {
    const trimmed = manualValue.trim()
    if (trimmed) {
      onChange(trimmed.replace(/\bCtrl\b/gi, 'CommandOrControl'))
    }
    setManualMode(false)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400" style={{ marginBottom: 'var(--padding-sm)' }}>
        {label}
      </label>
      {manualMode ? (
        <div style={{ display: 'flex', gap: 'var(--padding-xs)' }}>
          <input
            autoFocus
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitManual() }}
            placeholder="e.g. Ctrl+Alt+Q"
            className="flex-1 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            style={{ padding: 'var(--padding-sm) var(--padding)' }}
          />
          <button onClick={submitManual}
            className="rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            style={{ padding: 'var(--padding-sm) 0.625rem' }}>OK</button>
          <button onClick={() => setManualMode(false)}
            className="rounded-lg bg-surface-200 dark:bg-surface-700 text-gray-500 text-sm hover:bg-surface-300 dark:hover:bg-surface-600"
            style={{ padding: 'var(--padding-sm) 0.625rem' }}>X</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--padding-xs)' }}>
          <div
            ref={inputRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBlur={() => { setRecording(false); setDisplayKeys([]) }}
            onClick={startRecording}
            className={`flex-1 rounded-lg text-sm outline-none cursor-pointer select-none transition-colors ${
              recording
                ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 text-blue-600 dark:text-blue-400'
                : 'bg-surface-100 dark:bg-surface-800 text-gray-700 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-surface-700'
            }`}
            style={{ padding: 'var(--padding-sm) var(--padding)' }}
          >
            {recording
              ? displayKeys.length > 0
                ? displayKeys.join(' + ') + ' + ...'
                : 'Press a key combination...'
              : acceleratorToDisplay(value)}
          </div>
          <button
            onClick={() => { setRecording(false); setManualMode(true); setManualValue(acceleratorToDisplay(value)) }}
            className="rounded-lg bg-surface-200 dark:bg-surface-700 text-gray-500 text-sm hover:bg-surface-300 dark:hover:bg-surface-600"
            style={{ padding: 'var(--padding-sm) 0.625rem' }}
            title="Type manually">edit</button>
        </div>
      )}
    </div>
  )
}
