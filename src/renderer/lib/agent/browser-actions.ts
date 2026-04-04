// Browser actions via Playwright (runs in main process, called via IPC)

// @ts-ignore
const { ipcRenderer } = window.require('electron')

export interface InteractiveElement {
  index: number
  tag: string
  type?: string
  text: string
  placeholder?: string
  href?: string
  ariaLabel?: string
  rect: { x: number; y: number; width: number; height: number }
}

export interface PageState {
  url: string
  title: string
  screenshot: string // base64 PNG
  elements: InteractiveElement[]
}

export async function launchBrowser(): Promise<{ url: string; title: string }> {
  return ipcRenderer.invoke('pw:launch')
}

export async function closeBrowser(): Promise<void> {
  return ipcRenderer.invoke('pw:close')
}

export async function getPageState(): Promise<PageState> {
  return ipcRenderer.invoke('pw:get-page-state')
}

export async function captureScreenshot(): Promise<string> {
  return ipcRenderer.invoke('pw:screenshot')
}

export async function getInteractiveElements(): Promise<InteractiveElement[]> {
  return ipcRenderer.invoke('pw:get-elements')
}

export async function clickElement(index: number, elements: InteractiveElement[]): Promise<string> {
  const el = elements.find((e) => e.index === index)
  if (!el) return `Error: element [${index}] not found. The page has ${elements.length} elements (indices 0–${elements.length - 1}). The page may have changed — look at the updated screenshot and elements list before clicking.`
  const result = await ipcRenderer.invoke('pw:click', index)
  if (!result.success) return result.error
  return `Clicked element [${index}] "${el.text || el.tag}"`
}

export async function typeText(index: number, text: string, elements: InteractiveElement[]): Promise<string> {
  const el = elements.find((e) => e.index === index)
  if (!el) return `Error: element [${index}] not found. The page has ${elements.length} elements (indices 0–${elements.length - 1}). The page may have changed — look at the updated screenshot and elements list.`
  const result = await ipcRenderer.invoke('pw:type', index, text)
  if (!result.success) return result.error
  return `Typed "${text}" into element [${index}] "${el.placeholder || el.tag}"`
}

export async function pressKey(key: string): Promise<string> {
  await ipcRenderer.invoke('pw:press-key', key)
  return `Pressed key: ${key}`
}

export async function scrollPage(direction: 'up' | 'down'): Promise<string> {
  await ipcRenderer.invoke('pw:scroll', direction)
  return `Scrolled ${direction}`
}

export async function navigateTo(url: string): Promise<string> {
  const result = await ipcRenderer.invoke('pw:navigate', url)
  return `Navigated to ${result.url}`
}

export async function getPageText(): Promise<string> {
  return ipcRenderer.invoke('pw:get-text')
}

export async function goBack(): Promise<{ url: string; title: string }> {
  return ipcRenderer.invoke('pw:go-back')
}

export async function goForward(): Promise<{ url: string; title: string }> {
  return ipcRenderer.invoke('pw:go-forward')
}

export async function reload(): Promise<{ url: string; title: string }> {
  return ipcRenderer.invoke('pw:reload')
}

export function formatElementsForLLM(elements: InteractiveElement[]): string {
  if (elements.length === 0) return 'No interactive elements found on the page.'
  return elements.map((el) => {
    const parts = [`[${el.index}]`, `<${el.tag}>`]
    if (el.type) parts.push(`type="${el.type}"`)
    if (el.text) parts.push(`"${el.text}"`)
    if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`)
    if (el.href) parts.push(`href="${el.href}"`)
    if (el.ariaLabel) parts.push(`aria="${el.ariaLabel}"`)
    return parts.join(' ')
  }).join('\n')
}
