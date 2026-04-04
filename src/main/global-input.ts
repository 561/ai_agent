import { BrowserWindow } from 'electron'

let started = false

export function setupGlobalInput(getWindow: () => BrowserWindow | null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uIOhook } = require('uiohook-napi')

    uIOhook.on('wheel', (e: any) => {
      if (!e.ctrlKey || !e.shiftKey) return
      const win = getWindow()
      if (!win || !win.isVisible()) return
      // rotation > 0 = scroll down = next tab, < 0 = scroll up = prev tab
      const direction = e.rotation > 0 ? 'right' : 'left'
      win.webContents.send('global-wheel-tab-switch', direction)
    })

    uIOhook.start()
    started = true
  } catch (err) {
    console.warn('[global-input] uiohook-napi not available:', err)
  }
}

export function teardownGlobalInput() {
  if (!started) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uIOhook } = require('uiohook-napi')
    uIOhook.stop()
  } catch {}
}
