import {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  clipboard,
} from 'electron'
import path from 'path'
import { setupTray } from './tray'
import { setupIpcHandlers } from './ipc-handlers'
import { getSelection } from './clipboard'

let mainWindow: BrowserWindow | null = null
let currentHotkey = 'CommandOrControl+Shift+Space'
let currentSelectionHotkey = 'CommandOrControl+Shift+V'

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
    showWindowAtCursor()
  }
}

function showWindowAtCursor() {
  if (!mainWindow) return

  // Read stored preference for window mode
  const windowMode = 'cursor' // will be read from store via IPC

  if (windowMode === 'cursor') {
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)
    const bounds = display.workArea

    let x = cursorPoint.x - 240
    let y = cursorPoint.y - 40

    // Keep window within screen bounds
    x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - 480))
    y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - 640))

    mainWindow.setPosition(x, y)
  }

  mainWindow.show()
  mainWindow.focus()
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

  try {
    globalShortcut.register(currentSelectionHotkey, async () => {
      const selectedText = await getSelection()
      if (selectedText && mainWindow) {
        if (!mainWindow.isVisible()) {
          showWindowAtCursor()
        }
        mainWindow.webContents.send('selection-text', selectedText)
      }
    })
  } catch (e) {
    console.error('Failed to register selection hotkey:', currentSelectionHotkey, e)
  }
}

function isValidAccelerator(accel: string): boolean {
  return /^[\x20-\x7E]+$/.test(accel) && accel.includes('+')
}

function updateHotkey(type: 'toggle' | 'selection', accelerator: string) {
  if (!isValidAccelerator(accelerator)) {
    console.warn('Invalid accelerator (non-ASCII), ignoring:', accelerator)
    return
  }
  if (type === 'toggle') {
    currentHotkey = accelerator
  } else {
    currentSelectionHotkey = accelerator
  }
  registerHotkeys()
}

app.whenReady().then(() => {
  const appPath = app.getAppPath()
  DIST = path.join(appPath, 'dist')
  DIST_ELECTRON = path.join(appPath, 'dist-electron')

  createWindow()
  registerHotkeys()
  setupTray(mainWindow!, toggleWindow)
  setupIpcHandlers(mainWindow!, updateHotkey)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
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
