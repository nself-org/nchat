/**
 * Chat layout — top-level layout shell with resizable sidebar.
 * Strips react-resizable-panels; uses CSS flex + inline width state instead.
 * Injectable ChatLayoutAdapter replaces store/context deps.
 *
 * @module layout/chat-layout
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// Context
// ============================================================================

export interface ChatLayoutState {
  sidebarWidth: number
  isSidebarOpen: boolean
  isThreadPanelOpen: boolean
  threadPanelWidth: number
}

export interface ChatLayoutActions {
  setSidebarWidth: (w: number) => void
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setThreadPanelOpen: (open: boolean) => void
  setThreadPanelWidth: (w: number) => void
}

const ChatLayoutContext = React.createContext<
  (ChatLayoutState & ChatLayoutActions) | null
>(null)

export function useChatLayout(): ChatLayoutState & ChatLayoutActions {
  const ctx = React.useContext(ChatLayoutContext)
  if (!ctx) throw new Error('useChatLayout must be used inside ChatLayoutProvider')
  return ctx
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_SIDEBAR_WIDTH = 240
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 360

const DEFAULT_THREAD_PANEL_WIDTH = 360
const MIN_THREAD_PANEL_WIDTH = 280
const MAX_THREAD_PANEL_WIDTH = 520

// ============================================================================
// Provider
// ============================================================================

export interface ChatLayoutProviderProps {
  children: React.ReactNode
  defaultSidebarWidth?: number
  defaultSidebarOpen?: boolean
  defaultThreadPanelOpen?: boolean
  defaultThreadPanelWidth?: number
}

export function ChatLayoutProvider({
  children,
  defaultSidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  defaultSidebarOpen = true,
  defaultThreadPanelOpen = false,
  defaultThreadPanelWidth = DEFAULT_THREAD_PANEL_WIDTH,
}: ChatLayoutProviderProps) {
  const [sidebarWidth, setSidebarWidthState] = React.useState(defaultSidebarWidth)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(defaultSidebarOpen)
  const [isThreadPanelOpen, setIsThreadPanelOpen] = React.useState(defaultThreadPanelOpen)
  const [threadPanelWidth, setThreadPanelWidthState] = React.useState(defaultThreadPanelWidth)

  const setSidebarWidth = React.useCallback((w: number) => {
    setSidebarWidthState(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, w)))
  }, [])

  const toggleSidebar = React.useCallback(() => setIsSidebarOpen((v) => !v), [])
  const openSidebar = React.useCallback(() => setIsSidebarOpen(true), [])
  const closeSidebar = React.useCallback(() => setIsSidebarOpen(false), [])

  const setThreadPanelOpen = React.useCallback((open: boolean) => setIsThreadPanelOpen(open), [])

  const setThreadPanelWidth = React.useCallback((w: number) => {
    setThreadPanelWidthState(Math.min(MAX_THREAD_PANEL_WIDTH, Math.max(MIN_THREAD_PANEL_WIDTH, w)))
  }, [])

  const value = React.useMemo<ChatLayoutState & ChatLayoutActions>(
    () => ({
      sidebarWidth,
      isSidebarOpen,
      isThreadPanelOpen,
      threadPanelWidth,
      setSidebarWidth,
      toggleSidebar,
      openSidebar,
      closeSidebar,
      setThreadPanelOpen,
      setThreadPanelWidth,
    }),
    [
      sidebarWidth,
      isSidebarOpen,
      isThreadPanelOpen,
      threadPanelWidth,
      setSidebarWidth,
      toggleSidebar,
      openSidebar,
      closeSidebar,
      setThreadPanelOpen,
      setThreadPanelWidth,
    ]
  )

  return (
    <ChatLayoutContext.Provider value={value}>
      {children}
    </ChatLayoutContext.Provider>
  )
}

// ============================================================================
// Resize handle
// ============================================================================

function ResizeHandle({
  onResize,
  side,
}: {
  onResize: (delta: number) => void
  side: 'right' | 'left'
}) {
  const isDragging = React.useRef(false)
  const lastX = React.useRef(0)

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      lastX.current = e.clientX

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return
        const delta = ev.clientX - lastX.current
        lastX.current = ev.clientX
        onResize(side === 'right' ? delta : -delta)
      }

      const onMouseUp = () => {
        isDragging.current = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [onResize, side]
  )

  return (
    <div
      className={cn(
        'group/resize relative z-10 flex w-1 cursor-col-resize items-center justify-center',
        'shrink-0 select-none',
        'after:absolute after:inset-y-0 after:w-4 after:-translate-x-1/2',
        side === 'right' ? 'after:left-1/2' : 'after:left-1/2'
      )}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    >
      <div className="h-8 w-px rounded-full bg-border transition-all group-hover/resize:w-0.5 group-hover/resize:bg-border/80" />
    </div>
  )
}

// ============================================================================
// Chat Layout
// ============================================================================

export interface ChatLayoutProps {
  /** Sidebar slot */
  sidebar?: React.ReactNode
  /** Main content area (message list + composer) */
  main: React.ReactNode
  /** Optional thread panel (shown on the right when a thread is open) */
  threadPanel?: React.ReactNode
  className?: string
}

export function ChatLayout({
  sidebar,
  main,
  threadPanel,
  className,
}: ChatLayoutProps) {
  const layout = useChatLayout()

  return (
    <div
      className={cn(
        'flex h-full w-full overflow-hidden',
        className
      )}
    >
      {/* Sidebar */}
      {sidebar && layout.isSidebarOpen && (
        <>
          <div
            className="relative flex h-full shrink-0 overflow-hidden"
            style={{ width: layout.sidebarWidth }}
          >
            {sidebar}
          </div>
          <ResizeHandle
            side="right"
            onResize={(delta) => layout.setSidebarWidth(layout.sidebarWidth + delta)}
          />
        </>
      )}

      {/* Main content */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {main}
      </main>

      {/* Thread panel */}
      {threadPanel && layout.isThreadPanelOpen && (
        <>
          <ResizeHandle
            side="left"
            onResize={(delta) => layout.setThreadPanelWidth(layout.threadPanelWidth + delta)}
          />
          <div
            className="relative flex h-full shrink-0 overflow-hidden border-l"
            style={{ width: layout.threadPanelWidth }}
          >
            {threadPanel}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Root layout (wraps Provider + ChatLayout in one)
// ============================================================================

export interface ChatLayoutRootProps extends ChatLayoutProviderProps, ChatLayoutProps {}

export function ChatLayoutRoot({
  sidebar,
  main,
  threadPanel,
  className,
  defaultSidebarWidth,
  defaultSidebarOpen,
  defaultThreadPanelOpen,
  defaultThreadPanelWidth,
}: ChatLayoutRootProps) {
  return (
    <ChatLayoutProvider
      defaultSidebarWidth={defaultSidebarWidth}
      defaultSidebarOpen={defaultSidebarOpen}
      defaultThreadPanelOpen={defaultThreadPanelOpen}
      defaultThreadPanelWidth={defaultThreadPanelWidth}
    >
      <ChatLayout
        sidebar={sidebar}
        main={main}
        threadPanel={threadPanel}
        className={className}
      />
    </ChatLayoutProvider>
  )
}
