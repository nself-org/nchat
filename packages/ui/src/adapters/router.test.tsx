/**
 * Tests for adapters/router — RouterAdapter, useRouter hook, noopRouterAdapter
 */

import { describe, it, expect, vi } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import React from 'react'
import {
  RouterAdapterContext,
  useRouter,
  noopRouterAdapter,
  type RouterAdapter,
} from './router'
import { createMockRouter } from '../test/mocks'

// ============================================================================
// noopRouterAdapter
// ============================================================================

describe('noopRouterAdapter', () => {
  it('has the correct shape', () => {
    expect(typeof noopRouterAdapter.push).toBe('function')
    expect(typeof noopRouterAdapter.replace).toBe('function')
    expect(typeof noopRouterAdapter.back).toBe('function')
    expect(noopRouterAdapter.query).toEqual({})
    expect(noopRouterAdapter.pathname).toBe('/')
  })

  it('push logs and does not throw', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    noopRouterAdapter.push('/test')
    expect(spy).toHaveBeenCalledWith('[noop router] push:', '/test')
    spy.mockRestore()
  })

  it('replace logs and does not throw', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    noopRouterAdapter.replace('/other')
    expect(spy).toHaveBeenCalledWith('[noop router] replace:', '/other')
    spy.mockRestore()
  })

  it('back logs and does not throw', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    noopRouterAdapter.back()
    expect(spy).toHaveBeenCalledWith('[noop router] back')
    spy.mockRestore()
  })
})

// ============================================================================
// useRouter hook
// ============================================================================

describe('useRouter()', () => {
  it('returns the adapter provided via context', () => {
    const mockAdapter = createMockRouter({ pathname: '/chat' })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RouterAdapterContext.Provider value={mockAdapter}>
        {children}
      </RouterAdapterContext.Provider>
    )
    const { result } = renderHook(() => useRouter(), { wrapper })
    expect(result.current).toBe(mockAdapter)
    expect(result.current.pathname).toBe('/chat')
  })

  it('throws when no provider is present', () => {
    // Suppress the expected error from React in test output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useRouter())).toThrow(
      '[useRouter] No RouterAdapter found.'
    )
    spy.mockRestore()
  })

  it('router.push delegates to mock', () => {
    const mockAdapter = createMockRouter()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RouterAdapterContext.Provider value={mockAdapter}>
        {children}
      </RouterAdapterContext.Provider>
    )
    const { result } = renderHook(() => useRouter(), { wrapper })
    result.current.push('/new-path')
    expect(mockAdapter.push).toHaveBeenCalledWith('/new-path')
  })

  it('router.replace delegates to mock', () => {
    const mockAdapter = createMockRouter()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RouterAdapterContext.Provider value={mockAdapter}>
        {children}
      </RouterAdapterContext.Provider>
    )
    const { result } = renderHook(() => useRouter(), { wrapper })
    result.current.replace('/replaced')
    expect(mockAdapter.replace).toHaveBeenCalledWith('/replaced')
  })

  it('router.back delegates to mock', () => {
    const mockAdapter = createMockRouter()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RouterAdapterContext.Provider value={mockAdapter}>
        {children}
      </RouterAdapterContext.Provider>
    )
    const { result } = renderHook(() => useRouter(), { wrapper })
    result.current.back()
    expect(mockAdapter.back).toHaveBeenCalled()
  })
})

// ============================================================================
// createMockRouter
// ============================================================================

describe('createMockRouter()', () => {
  it('returns a RouterAdapter with vi mocks', () => {
    const router = createMockRouter()
    expect(router.query).toEqual({})
    expect(router.pathname).toBe('/')
    router.push('/foo')
    expect(router.push).toHaveBeenCalledWith('/foo')
  })

  it('accepts overrides', () => {
    const router = createMockRouter({ pathname: '/settings', query: { tab: 'profile' } })
    expect(router.pathname).toBe('/settings')
    expect(router.query).toEqual({ tab: 'profile' })
  })
})

// ============================================================================
// RouterAdapterContext
// ============================================================================

describe('RouterAdapterContext', () => {
  it('has the correct displayName', () => {
    expect(RouterAdapterContext.displayName).toBe('RouterAdapterContext')
  })

  it('provides adapter to consumer component', () => {
    const mockAdapter: RouterAdapter = createMockRouter({ pathname: '/admin' })
    let captured: RouterAdapter | null = null

    function Consumer() {
      captured = React.useContext(RouterAdapterContext)
      return null
    }

    render(
      <RouterAdapterContext.Provider value={mockAdapter}>
        <Consumer />
      </RouterAdapterContext.Provider>
    )

    expect(captured).toBe(mockAdapter)
  })
})
