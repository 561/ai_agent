import { ipcMain, app } from 'electron'
import { chromium, type BrowserContext, type Page } from 'playwright'
import path from 'path'

let context: BrowserContext | null = null
let page: Page | null = null

function getProfilePath(): string {
  return path.join(app.getPath('userData'), 'browser-profile')
}

// Chrome holds hundreds of MB — close it when the agent hasn't used it for a while.
// The persistent profile keeps logins, so relaunching is cheap.
const IDLE_CLOSE_MS = 20 * 60 * 1000
let idleTimer: NodeJS.Timeout | null = null

function scheduleIdleClose() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => {
    if (!context) return
    await context.close().catch(() => {})
    context = null
    page = null
  }, IDLE_CLOSE_MS)
}

async function ensureBrowser(): Promise<Page> {
  scheduleIdleClose()
  if (page && !page.isClosed()) return page

  if (context) {
    try { await context.close() } catch {}
  }

  // Persistent context keeps cookies, logins, localStorage between sessions
  const options = {
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 800 },
  }
  try {
    // System Chrome first: Playwright can't download its Chromium on every distro
    context = await chromium.launchPersistentContext(getProfilePath(), { ...options, channel: 'chrome' })
  } catch {
    context = await chromium.launchPersistentContext(getProfilePath(), {
      ...options,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
  }
  page = context.pages()[0] || await context.newPage()
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
  return page
}

// Elements beyond this are rarely useful and only bloat the LLM context
const MAX_ELEMENTS = 120
const TEXT_PAGE_SIZE = 6000

const INTERACTIVE_SELECTORS = 'a, button, input, textarea, select, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [onclick], [contenteditable="true"]'

async function getInteractiveElements(p: Page) {
  return p.evaluate(([selectors, MAX_ELEMENTS]) => {
    const nodes = document.querySelectorAll(selectors)
    const results: any[] = []
    let index = 0
    for (const el of nodes) {
      if (results.length >= MAX_ELEMENTS) break
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
      const tag = el.tagName.toLowerCase()
      results.push({
        index: index++,
        tag,
        type: el.getAttribute('type') || undefined,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 80),
        placeholder: el.getAttribute('placeholder') || undefined,
        href: tag === 'a' ? (el.getAttribute('href') || '').substring(0, 120) || undefined : undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      })
    }
    return results
  }, [INTERACTIVE_SELECTORS, MAX_ELEMENTS] as const)
}

async function findElementByIndex(p: Page, index: number) {
  return p.evaluateHandle((args) => {
    const [selectors, targetIndex] = args
    const nodes = document.querySelectorAll(selectors)
    let idx = 0
    for (const el of nodes) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
      if (idx === targetIndex) return el
      idx++
    }
    return null
  }, [INTERACTIVE_SELECTORS, index] as const)
}

// Visible text of the main content area, whitespace-collapsed, paged by TEXT_PAGE_SIZE
async function pageText(p: Page, offset: number): Promise<string> {
  const text = await p.evaluate(() => {
    const collect = (root: Element) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          if (parent.closest('script, style, noscript, svg, nav, footer, aside, [aria-hidden="true"]')) {
            return NodeFilter.FILTER_REJECT
          }
          const style = window.getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT
          if ((node.textContent || '').trim().length === 0) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        },
      })
      const texts: string[] = []
      while (walker.nextNode()) {
        texts.push(walker.currentNode.textContent!.replace(/\s+/g, ' ').trim())
      }
      return texts.join('\n')
    }
    if (!document.body) return ''
    const main = document.querySelector('main, article, [role="main"]')
    const mainText = main ? collect(main) : ''
    // Some sites wrap only a fragment in <main> — fall back to the whole body
    return mainText.length > 500 ? mainText : collect(document.body)
  })
  const chunk = text.substring(offset, offset + TEXT_PAGE_SIZE)
  const rest = text.length - offset - chunk.length
  return rest > 0 ? `${chunk}\n\n[${rest} more chars — call again with offset=${offset + chunk.length}]` : chunk
}

export function setupPlaywrightHandlers() {
  ipcMain.handle('pw:launch', async () => {
    const p = await ensureBrowser()
    return { url: p.url(), title: await p.title() }
  })

  ipcMain.handle('pw:close', async () => {
    if (context) {
      await context.close()
      context = null
      page = null
    }
  })

  ipcMain.handle('pw:navigate', async (_e, url: string) => {
    const p = await ensureBrowser()
    let fullUrl = url
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl
    }
    await p.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
    return { url: p.url(), title: await p.title() }
  })

  ipcMain.handle('pw:screenshot', async () => {
    const p = await ensureBrowser()
    const buffer = await p.screenshot({ type: 'jpeg', quality: 60 })
    return buffer.toString('base64')
  })

  ipcMain.handle('pw:get-elements', async () => {
    const p = await ensureBrowser()
    return getInteractiveElements(p)
  })

  ipcMain.handle('pw:get-page-state', async () => {
    const p = await ensureBrowser()
    const [screenshot, elements] = await Promise.all([
      p.screenshot({ type: 'jpeg', quality: 60 }).then((b) => b.toString('base64')),
      getInteractiveElements(p),
    ])
    return {
      url: p.url(),
      title: await p.title(),
      screenshot,
      elements,
    }
  })

  ipcMain.handle('pw:click', async (_e, index: number) => {
    const p = await ensureBrowser()
    const handle = await findElementByIndex(p, index)
    const el = handle.asElement()
    if (!el) return { success: false, error: `Element [${index}] not found` }
    await el.scrollIntoViewIfNeeded().catch(() => {})
    await el.click({ timeout: 5000 }).catch(async () => {
      // Fallback: JS click
      await el.evaluate((e: any) => e.click())
    })
    return { success: true }
  })

  ipcMain.handle('pw:type', async (_e, index: number, text: string) => {
    const p = await ensureBrowser()
    const handle = await findElementByIndex(p, index)
    const el = handle.asElement()
    if (!el) return { success: false, error: `Element [${index}] not found` }
    await el.scrollIntoViewIfNeeded().catch(() => {})
    // Clear existing text and type new
    await el.click({ timeout: 3000 }).catch(() => {})
    await el.fill(text).catch(async () => {
      // Fallback for non-input elements
      await el.evaluate((e: any, t: string) => {
        if (e.value !== undefined) e.value = t
        else e.textContent = t
        e.dispatchEvent(new Event('input', { bubbles: true }))
      }, text)
    })
    return { success: true }
  })

  ipcMain.handle('pw:press-key', async (_e, key: string) => {
    const p = await ensureBrowser()
    await p.keyboard.press(key)
    return { success: true }
  })

  ipcMain.handle('pw:scroll', async (_e, direction: 'up' | 'down') => {
    const p = await ensureBrowser()
    const amount = direction === 'down' ? 500 : -500
    await p.mouse.wheel(0, amount)
    return { success: true }
  })

  ipcMain.handle('pw:get-text', async (_e, offset = 0) => {
    const p = await ensureBrowser()
    return pageText(p, offset)
  })

  // Reads a URL in a background tab so the agent can check sources without
  // disturbing the visible page or paying for screenshots
  ipcMain.handle('pw:read-url', async (_e, url: string, offset = 0) => {
    await ensureBrowser()
    const tab = await context!.newPage()
    try {
      const fullUrl = /^https?:\/\//.test(url) ? url : 'https://' + url
      await tab.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await tab.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {})
      return `URL: ${tab.url()}\nTitle: ${await tab.title()}\n\n${await pageText(tab, offset)}`
    } catch (err: any) {
      return `Error reading ${url}: ${err.message}`
    } finally {
      await tab.close().catch(() => {})
    }
  })

  ipcMain.handle('pw:go-back', async () => {
    const p = await ensureBrowser()
    await p.goBack({ timeout: 10000 }).catch(() => {})
    return { url: p.url(), title: await p.title() }
  })

  ipcMain.handle('pw:go-forward', async () => {
    const p = await ensureBrowser()
    await p.goForward({ timeout: 10000 }).catch(() => {})
    return { url: p.url(), title: await p.title() }
  })

  ipcMain.handle('pw:reload', async () => {
    const p = await ensureBrowser()
    await p.reload({ timeout: 10000 }).catch(() => {})
    return { url: p.url(), title: await p.title() }
  })

  // Cleanup on app quit
  const cleanup = async () => {
    if (context) {
      await context.close().catch(() => {})
      context = null
      page = null
    }
  }

  process.on('exit', () => { cleanup() })
  process.on('SIGTERM', () => { cleanup() })
}
