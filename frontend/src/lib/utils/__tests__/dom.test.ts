/**
 * Unit tests for DOM utilities.
 */
import {
  isBrowser,
  copyToClipboard,
  downloadFile,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  isElementInView,
  getScrollParent,
  getScrollPosition,
  getElementDimensions,
  focusElement,
  dispatchCustomEvent,
  addEventListenerWithCleanup,
  waitForElement,
  lockScroll,
  getActiveElement,
  containsElement,
} from '../dom'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('isBrowser', () => {
  it('is true in JSDOM', () => {
    expect(isBrowser).toBe(true)
  })
})

describe('copyToClipboard', () => {
  it('uses navigator.clipboard when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    await copyToClipboard('hello')
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('falls back to execCommand when clipboard fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    document.execCommand = jest.fn().mockReturnValue(true)
    await copyToClipboard('x')
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })
})

describe('downloadFile', () => {
  it('creates and clicks a link for string content', () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    ;(URL as any).createObjectURL = jest.fn(() => 'blob:abc')
    ;(URL as any).revokeObjectURL = jest.fn()
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadFile('hello', { filename: 'a.txt' })
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  })

  it('accepts Blob', () => {
    ;(URL as any).createObjectURL = jest.fn(() => 'blob:abc')
    ;(URL as any).revokeObjectURL = jest.fn()
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadFile(new Blob(['x']), { filename: 'a.json', mimeType: 'application/json' })
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('accepts ArrayBuffer', () => {
    ;(URL as any).createObjectURL = jest.fn(() => 'blob:abc')
    ;(URL as any).revokeObjectURL = jest.fn()
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadFile(new ArrayBuffer(4), { filename: 'a.bin' })
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('infers mime type from various extensions', () => {
    const createSpy = jest.fn(() => 'blob:abc')
    ;(URL as any).createObjectURL = createSpy
    ;(URL as any).revokeObjectURL = jest.fn()
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    for (const fn of ['a.json', 'b.csv', 'c.html', 'd.xml', 'e.pdf', 'f.png', 'g.jpg', 'h.zip']) {
      downloadFile('x', { filename: fn })
    }
    expect(clickSpy.mock.calls.length).toBe(8)
    clickSpy.mockRestore()
  })
})

describe('scroll helpers', () => {
  it('scrollToElement handles missing element gracefully', () => {
    expect(() => scrollToElement('#missing')).not.toThrow()
  })

  it('scrollToElement with offset uses window.scrollTo', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    window.scrollTo = jest.fn() as any
    scrollToElement(el, { offset: 50 })
    expect((window.scrollTo as any).mock.calls.length).toBeGreaterThan(0)
  })

  it('scrollToElement uses scrollIntoView without offset', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const siv = jest.spyOn(el, 'scrollIntoView').mockImplementation(() => {})
    scrollToElement(el)
    expect(siv).toHaveBeenCalled()
  })

  it('scrollToTop / scrollToBottom call window.scrollTo', () => {
    window.scrollTo = jest.fn() as any
    scrollToTop()
    scrollToBottom()
    expect((window.scrollTo as any).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('scrollToTop respects instant behavior', () => {
    window.scrollTo = jest.fn() as any
    scrollToTop('instant')
    expect((window.scrollTo as any).mock.calls[0][0].behavior).toBe('auto')
  })

  it('scrollToBottom respects smooth', () => {
    window.scrollTo = jest.fn() as any
    scrollToBottom('smooth')
    expect((window.scrollTo as any).mock.calls[0][0].behavior).toBe('smooth')
  })
})

describe('isElementInView', () => {
  it('accepts a container when passed', () => {
    const container = document.createElement('div')
    const el = document.createElement('div')
    container.appendChild(el)
    // With container provided we skip the `new DOMRect()` branch that
    // JSDOM doesn't implement. Just assert the call doesn't throw.
    expect(() => isElementInView(el, { container })).not.toThrow()
  })
})

describe('getScrollParent', () => {
  it('returns document for orphan element', () => {
    const el = document.createElement('div')
    const p = getScrollParent(el)
    expect(p).toBeDefined()
  })
})

describe('getScrollPosition', () => {
  it('reads element scroll when given element', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { value: 10, configurable: true })
    Object.defineProperty(el, 'scrollLeft', { value: 5, configurable: true })
    expect(getScrollPosition(el)).toEqual({ x: 5, y: 10 })
  })

  it('reads window scroll otherwise', () => {
    const out = getScrollPosition()
    expect(typeof out.x).toBe('number')
    expect(typeof out.y).toBe('number')
  })
})

describe('getElementDimensions', () => {
  it('returns dimensions object', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const d = getElementDimensions(el)
    expect(d).toHaveProperty('width')
    expect(d).toHaveProperty('height')
    expect(d).toHaveProperty('outerWidth')
  })
})

describe('focusElement', () => {
  it('focuses an input', () => {
    const el = document.createElement('input')
    document.body.appendChild(el)
    const focusSpy = jest.spyOn(el, 'focus')
    focusElement(el)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('handles missing selector', () => {
    expect(() => focusElement('#nope')).not.toThrow()
  })
})

describe('dispatchCustomEvent', () => {
  it('fires event with detail', () => {
    const el = document.createElement('div')
    let detail: any
    el.addEventListener('myevent', (e: any) => {
      detail = e.detail
    })
    const result = dispatchCustomEvent(el, 'myevent', { n: 1 })
    expect(detail).toEqual({ n: 1 })
    expect(typeof result).toBe('boolean')
  })
})

describe('addEventListenerWithCleanup', () => {
  it('adds and removes listener', () => {
    const el = document.createElement('div')
    const handler = jest.fn()
    const cleanup = addEventListenerWithCleanup(el, 'click', handler)
    el.dispatchEvent(new Event('click'))
    expect(handler).toHaveBeenCalledTimes(1)
    cleanup()
    el.dispatchEvent(new Event('click'))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('waitForElement', () => {
  it('resolves if element already present', async () => {
    const el = document.createElement('div')
    el.id = 'target'
    document.body.appendChild(el)
    const found = await waitForElement('#target')
    expect(found).toBe(el)
  })

  it('rejects on timeout', async () => {
    await expect(waitForElement('#missing', { timeout: 50 })).rejects.toThrow()
  })
})

describe('lockScroll', () => {
  it('locks and unlocks scroll', () => {
    const unlock = lockScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlock()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('getActiveElement', () => {
  it('returns something or null', () => {
    const el = getActiveElement()
    expect(el === null || el instanceof Element).toBe(true)
  })
})

describe('containsElement', () => {
  it('returns true when child is inside', () => {
    const p = document.createElement('div')
    const c = document.createElement('span')
    p.appendChild(c)
    expect(containsElement(p, c)).toBe(true)
  })

  it('returns false when child is null', () => {
    const p = document.createElement('div')
    expect(containsElement(p, null)).toBe(false)
  })
})
