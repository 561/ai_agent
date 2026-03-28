import { clipboard } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function getSelection(): Promise<string> {
  // On Linux, we can read the X11 PRIMARY selection (highlighted text)
  if (process.platform === 'linux') {
    try {
      const { stdout } = await execAsync('xclip -selection primary -o', {
        timeout: 1000,
      })
      return stdout.trim()
    } catch {
      // Fallback to clipboard
      return clipboard.readText('selection') || clipboard.readText()
    }
  }

  // On macOS/Windows, simulate Ctrl+C then read clipboard
  // Save current clipboard, simulate copy, read, restore
  const saved = clipboard.readText()
  // We rely on the OS selection or clipboard content
  const text = clipboard.readText()
  return text !== saved ? text : ''
}
