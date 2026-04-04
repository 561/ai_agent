import {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  clipboard,
  session,
} from 'electron'

import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'
import { setupTray } from './tray'
import { setupIpcHandlers } from './ipc-handlers'
import { setupGlobalInput, teardownGlobalInput } from './global-input'

let mainWindow: BrowserWindow | null = null
let currentHotkey = 'CommandOrControl+Shift+Space'
let windowMode: 'cursor' | 'pinned' = 'cursor'
let pinnedPositionSet = false

let DIST = ''
let DIST_ELECTRON = ''

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'))
  }

  mainWindow.on('blur', () => {
    // Don't hide if settings are open — let user decide
  })
}

function toggleWindow() {
  if (!mainWindow) return

  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showWindow()
  }
}

function showWindow() {
  if (!mainWindow) return

  if (windowMode === 'cursor' || !pinnedPositionSet) {
    showWindowAtCursor()
    if (windowMode === 'pinned') pinnedPositionSet = true
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function getRealCursorPoint(): { x: number; y: number } {
  if (process.platform === 'linux') {
    try {
      const bundled = path.join(process.resourcesPath, 'bin', 'xdotool')
      const xdotool = fs.existsSync(bundled) ? bundled : 'xdotool'
      const out = execSync(`${xdotool} getmouselocation 2>/dev/null`, { timeout: 300 }).toString()
      const xm = out.match(/x:(\d+)/)
      const ym = out.match(/y:(\d+)/)
      if (xm && ym) {
        return { x: parseInt(xm[1]), y: parseInt(ym[1]) }
      }
    } catch {}
  }
  return screen.getCursorScreenPoint()
}

function showWindowAtCursor() {
  if (!mainWindow) return

  const cursorPoint = getRealCursorPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { workArea } = display
  const [winWidth, winHeight] = mainWindow.getSize()

  let x = cursorPoint.x - Math.round(winWidth / 2)
  let y = cursorPoint.y - Math.round(winHeight / 2)

  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winWidth))
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winHeight))

  mainWindow.show()
  mainWindow.focus()
  mainWindow.setPosition(x, y)
}

function registerHotkeys() {
  globalShortcut.unregisterAll()

  try {
    globalShortcut.register(currentHotkey, () => {
      toggleWindow()
    })
  } catch (e) {
    console.error('Failed to register toggle hotkey:', currentHotkey, e)
  }

}

function isValidAccelerator(accel: string): boolean {
  return /^[\x20-\x7E]+$/.test(accel) && accel.includes('+')
}

function updateWindowMode(mode: 'cursor' | 'pinned') {
  windowMode = mode
  if (mode === 'cursor') {
    pinnedPositionSet = false
  }
}

function updateHotkey(accelerator: string) {
  if (!isValidAccelerator(accelerator)) {
    console.warn('Invalid accelerator (non-ASCII), ignoring:', accelerator)
    return
  }
  currentHotkey = accelerator
  registerHotkeys()
}

app.whenReady().then(() => {
  const appPath = app.getAppPath()
  DIST = path.join(appPath, 'dist')
  DIST_ELECTRON = path.join(appPath, 'dist-electron')

  // Allow microphone access for Web Speech API
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media'
  })

  createWindow()
  registerHotkeys()
  setupTray(mainWindow!, toggleWindow)
  setupIpcHandlers(mainWindow!, updateHotkey, updateWindowMode)
  setupGlobalInput(() => mainWindow)

})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  teardownGlobalInput()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Handle second instance
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    showWindowAtCursor()
  }
})

export { mainWindow }
