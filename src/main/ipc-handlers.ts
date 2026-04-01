import { ipcMain, BrowserWindow, screen } from 'electron'

export function setupIpcHandlers(
  mainWindow: BrowserWindow,
  updateHotkey: (accelerator: string) => void,
  updateWindowMode: (mode: 'cursor' | 'pinned') => void,
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

  ipcMain.on('update-hotkey', (_event, accelerator: string) => {
    updateHotkey(accelerator)
  })

  ipcMain.on('update-window-mode', (_event, mode: 'cursor' | 'pinned') => {
    updateWindowMode(mode)
  })
}
