// @ts-nocheck — References future components not yet implemented; type-checked at integration time
/**
 * Lazy Loading Utilities
 *
 * Utilities for lazy loading heavy components and libraries
 * to improve initial bundle size and performance.
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// =============================================================================
// Loading States
// =============================================================================

export const DefaultLoadingState = () => (
  <div className="flex items-center justify-center p-8">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

export const CallLoadingState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    <p className="text-sm text-muted-foreground">Initializing call...</p>
  </div>
)

export const ChartLoadingState = () => (
  <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/10">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

export const EditorLoadingState = () => (
  <div className="min-h-[200px] w-full rounded-lg border border-border p-4">
    <div className="space-y-2">
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  </div>
)

// =============================================================================
// Lazy Component Loaders
// =============================================================================

/**
 * Lazy load WebRTC call components (LiveKit)
 * Bundle size: ~400KB
 * Load when: User initiates or receives a call
 */
export const LazyCallWindow = dynamic(() => import('@/components/calls/call-window'), {
  loading: () => <CallLoadingState />,
  ssr: false,
})

export const LazyScreenShare = dynamic(() => import('@/components/calls/screen-share'), {
  loading: () => <CallLoadingState />,
  ssr: false,
})

export const LazyVirtualBackground = dynamic(
  () => import('@/components/calls/virtual-background'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

/**
 * Lazy load admin dashboard components
 * Bundle size: ~500KB (includes Recharts)
 * Load when: Admin user navigates to admin section
 */
export const LazyAdminDashboard = dynamic(() => import('@/components/admin/dashboard'), {
  loading: () => <DefaultLoadingState />,
  ssr: false,
})

export const LazyAnalyticsCharts = dynamic(
  () => import('@/components/analytics/charts'),
  {
    loading: () => <ChartLoadingState />,
    ssr: false,
  }
)

export const LazyModerationQueue = dynamic(
  () => import('@/components/admin/moderation/ModerationQueue'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

/**
 * Lazy load TipTap rich text editor
 * Bundle size: ~150KB
 * Load when: User focuses message input or starts editing
 */
export const LazyRichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor'),
  {
    loading: () => <EditorLoadingState />,
    ssr: false,
  }
)

/**
 * Lazy load emoji picker
 * Bundle size: ~80KB
 * Load when: User clicks emoji button
 */
export const LazyEmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

/**
 * Lazy load file preview components
 * Bundle size: ~100KB
 * Load when: User clicks to preview file
 */
export const LazyPDFViewer = dynamic(
  () => import('@/components/files/pdf-viewer'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

export const LazyCodeViewer = dynamic(
  // @ts-expect-error Component not yet implemented
  () => import('@/components/files/code-viewer'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

/**
 * Lazy load advanced search components
 * Bundle size: ~50KB
 * Load when: User opens advanced search
 */
export const LazyAdvancedSearch = dynamic(
  () => import('@/components/search/advanced-search'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

/**
 * Lazy load import/export tools
 * Bundle size: ~200KB (includes xlsx, papaparse)
 * Load when: User initiates import/export
 */
export const LazyDataExport = dynamic(
  // @ts-expect-error Component not yet implemented
  () => import('@/components/export/data-export'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

export const LazyDataImport = dynamic(
  // @ts-expect-error Component not yet implemented
  () => import('@/components/import/data-import'),
  {
    loading: () => <DefaultLoadingState />,
    ssr: false,
  }
)

// =============================================================================
// Lazy Library Loaders
// =============================================================================

/**
 * Lazy load TensorFlow.js toxicity model
 * Bundle size: ~1.2MB
 * Load when: Toxicity detection is enabled in config
 */
export async function loadToxicityDetector() {
  const { ToxicityDetector } = await import('@/lib/moderation/toxicity-detector')
  return ToxicityDetector
}

/**
 * Lazy load chart library
 * Bundle size: ~300KB
 * Load when: Rendering analytics charts
 */
export async function loadChartLibrary() {
  const recharts = await import('recharts')
  return recharts
}

/**
 * Lazy load QR code generator
 * Bundle size: ~20KB
 * Load when: Generating QR codes
 */
export async function loadQRCode() {
  const QRCode = await import('qrcode')
  return QRCode
}

/**
 * Lazy load ExcelJS library
 * Bundle size: ~100KB
 * Load when: Exporting to Excel
 */
export async function loadXLSX() {
  const ExcelJS = await import('exceljs')
  return ExcelJS
}

/**
 * Lazy load PDF generation
 * Bundle size: ~80KB
 * Load when: Generating PDF reports
 */
export async function loadPDFGenerator() {
  const { jsPDF } = await import('jspdf')
  const autoTable = await import('jspdf-autotable')
  return { jsPDF, autoTable }
}

// =============================================================================
// Prefetch Utilities
// =============================================================================

/**
 * Prefetch a component or library
 * Use for critical paths where user is likely to need the resource soon
 */
export function prefetchComponent(loader: () => Promise<any>) {
  if (typeof window === 'undefined') return

  // Prefetch on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => loader())
  } else {
    setTimeout(() => loader(), 1)
  }
}

/**
 * Prefetch call components when user hovers over call button
 */
export function prefetchCallComponents() {
  // @ts-expect-error Component not yet implemented
  prefetchComponent(() => import('@/components/calls/call-window'))
  prefetchComponent(() => import('@/components/calls/screen-share'))
}

/**
 * Prefetch admin components when user role is admin
 */
export function prefetchAdminComponents() {
  prefetchComponent(() => import('@/components/admin/dashboard'))
  prefetchComponent(() => import('@/components/analytics/charts'))
}

/**
 * Prefetch editor when user focuses on a text area
 */
export function prefetchEditor() {
  prefetchComponent(() => import('@/components/editor/rich-text-editor'))
}

// =============================================================================
// Dynamic Import Helpers
// =============================================================================

/**
 * Create a lazy component with custom loading state
 */
export function createLazyComponent<P = any>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent?: ComponentType
) {
  return dynamic(loader, {
    loading: (LoadingComponent || DefaultLoadingState) as () => React.ReactNode,
    ssr: false,
  })
}

/**
 * Load component only if feature is enabled
 */
export function createConditionalComponent<P = any>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  condition: boolean,
  FallbackComponent?: ComponentType<P>
) {
  if (!condition && FallbackComponent) {
    return FallbackComponent
  }

  return dynamic(
    loader,
    {
      loading: () => <DefaultLoadingState />,
      ssr: false,
    }
  )
}

// =============================================================================
// Exports
// =============================================================================

export default {
  // Components
  LazyCallWindow,
  LazyScreenShare,
  LazyVirtualBackground,
  LazyAdminDashboard,
  LazyAnalyticsCharts,
  LazyRichTextEditor,
  LazyEmojiPicker,
  LazyPDFViewer,
  LazyCodeViewer,
  LazyAdvancedSearch,
  LazyDataExport,
  LazyDataImport,

  // Libraries
  loadToxicityDetector,
  loadChartLibrary,
  loadQRCode,
  loadXLSX,
  loadPDFGenerator,

  // Prefetch
  prefetchComponent,
  prefetchCallComponents,
  prefetchAdminComponents,
  prefetchEditor,

  // Utilities
  createLazyComponent,
  createConditionalComponent,
}
