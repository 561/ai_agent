import { ipcMain, BrowserWindow, screen } from 'electron'

export function setupIpcHandlers(
  mainWindow: BrowserWindow,
  updateHotkey: (type: 'toggle' | 'selection', accelerator: string) => void,
) {
  ipcMain.handle('get-cursor-position', () => {
    return screen.getCursorScreenPoint()
  })

  ipcMain.on('hide-window', () => {
    mainWindow.hide()
  })

  ipcMain.on('set-window-size', (_event, width: number, height: number) => {
    mainWindow.setSize(width, height)
  })

  ipcMain.on(
    'set-window-position',
    (_event, x: number, y: number) => {
      mainWindow.setPosition(x, y)
    },
  )

  ipcMain.on('set-always-on-top', (_event, flag: boolean) => {
    mainWindow.setAlwaysOnTop(flag)
  })

  ipcMain.on('update-hotkey', (_event, type: 'toggle' | 'selection', accelerator: string) => {
    updateHotkey(type, accelerator)
  })
}
