import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron'
import path from 'path'

let tray: Tray | null = null

function getIconPath(): string {
  if (app.isPackaged) {
    // extraResources copies resources/ into process.resourcesPath
    return path.join(process.resourcesPath, 'resources', 'icon-22.png')
  }
  return path.join(__dirname, '../../resources', 'icon-22.png')
}

export function setupTray(
  mainWindow: BrowserWindow,
  toggleWindow: () => void,
) {
  const iconPath = getIconPath()
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon)
  tray.setToolTip('AI Agent')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: toggleWindow,
    },
    {
      label: 'Settings',
      click: () => {
        if (!mainWindow.isVisible()) {
          toggleWindow()
        }
        mainWindow.webContents.send('open-settings')
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', toggleWindow)
}
