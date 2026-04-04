import { ipcMain } from 'electron'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null

async function ensureBrowser(): Promise<Page> {
  if (page && !page.isClosed()) return page

  if (browser) {
    try { await browser.close() } catch {}
  }

  browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  })
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  page = await context.newPage()
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
  return page
}

const INTERACTIVE_SELECTORS = 'a, button, input, textarea, select, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [onclick], [contenteditable="true"]'

async function getInteractiveElements(p: Page) {
  return p.evaluate((selectors) => {
    const nodes = document.querySelectorAll(selectors)
    const results: any[] = []
    let index = 0
    for (const el of nodes) {
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
        text: (el.textContent || '').trim().substring(0, 100),
        placeholder: el.getAttribute('placeholder') || undefined,
        href: tag === 'a' ? el.getAttribute('href') : undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      })
    }
    return results
  }, INTERACTIVE_SELECTORS)
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

export function setupPlaywrightHandlers() {
  ipcMain.handle('pw:launch', async () => {
    const p = await ensureBrowser()
    return { url: p.url(), title: await p.title() }
  })

  ipcMain.handle('pw:close', async () => {
    if (browser) {
      await browser.close()
      browser = null
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
    const buffer = await p.screenshot({ type: 'png' })
    return buffer.toString('base64')
  })

  ipcMain.handle('pw:get-elements', async () => {
    const p = await ensureBrowser()
    return getInteractiveElements(p)
  })

  ipcMain.handle('pw:get-page-state', async () => {
    const p = await ensureBrowser()
    const [screenshot, elements] = await Promise.all([
      p.screenshot({ type: 'png' }).then((b) => b.toString('base64')),
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

  ipcMain.handle('pw:get-text', async () => {
    const p = await ensureBrowser()
    const text = await p.evaluate(() => {
      const body = document.body
      if (!body) return ''
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const tag = parent.tagName.toLowerCase()
          if (['script', 'style', 'noscript', 'svg'].includes(tag)) return NodeFilter.FILTER_REJECT
          const style = window.getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT
          if ((node.textContent || '').trim().length === 0) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        },
      })
      const texts: string[] = []
      while (walker.nextNode()) {
        texts.push(walker.currentNode.textContent!.trim())
      }
      return texts.join('\n').substring(0, 8000)
    })
    return text
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
    if (browser) {
      await browser.close().catch(() => {})
      browser = null
    }
  }

  process.on('exit', () => { cleanup() })
  process.on('SIGTERM', () => { cleanup() })
}
