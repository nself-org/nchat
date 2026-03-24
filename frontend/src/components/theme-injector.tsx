'use client'

import { useEffect, useLayoutEffect } from 'react'
import { useAppConfig } from '@/contexts/app-config-context'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'

export function ThemeInjector() {
  const { config } = useAppConfig()
  const { setTheme } = useTheme()
  const pathname = usePathname()

  // Don't apply theme changes on setup pages
  const isSetupPage = pathname?.startsWith('/setup')

  // Use useLayoutEffect to apply theme before paint
  const applyTheme = () => {
    // Skip custom theme application on setup pages, but allow light/dark mode
    if (isSetupPage) {
      // Don't force dark mode, let user toggle
      return
    }

    const root = document.documentElement
    const { theme } = config

    // Always use dark mode for non-setup pages
    const isDark = true
    setTheme('dark')

    // Force dark class on html element
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')

    // Apply all theme colors
    // Primary colors
    root.style.setProperty('--primary', theme.primaryColor)
    root.style.setProperty('--primary-rgb', hexToRgb(theme.primaryColor))
    root.style.setProperty('--secondary', theme.secondaryColor)
    root.style.setProperty('--accent', theme.accentColor)

    // Surface colors - always use dark theme colors
    root.style.setProperty('--surface', theme.surfaceColor || '#1E293B')
    root.style.setProperty('--card', theme.surfaceColor || '#1E293B')
    root.style.setProperty('--popover', theme.surfaceColor || '#1E293B')
    root.style.setProperty('--muted', theme.mutedColor || '#94A3B8')
    root.style.setProperty('--border', theme.borderColor || '#334155')
    root.style.setProperty('--input', theme.borderColor || '#334155')

    // Button colors - always use dark theme colors
    root.style.setProperty('--button-primary-bg', theme.buttonPrimaryBg || theme.primaryColor)
    root.style.setProperty('--button-primary-text', theme.buttonPrimaryText || '#0F0F1A')
    root.style.setProperty('--button-secondary-bg', theme.buttonSecondaryBg || '#334155')
    root.style.setProperty('--button-secondary-text', theme.buttonSecondaryText || '#F8FAFC')

    // Status colors
    root.style.setProperty('--success', theme.successColor || '#10B981')
    root.style.setProperty('--warning', theme.warningColor || '#F59E0B')
    root.style.setProperty('--error', theme.errorColor || '#EF4444')
    root.style.setProperty('--info', theme.infoColor || '#3B82F6')

    // Background and foreground - always use dark theme colors
    root.style.setProperty('--background', theme.backgroundColor || '#0F0F1A')
    root.style.setProperty('--foreground', theme.textColor || '#F8FAFC')
    root.style.setProperty('--card-foreground', theme.textColor || '#F8FAFC')
    root.style.setProperty('--popover-foreground', theme.textColor || '#F8FAFC')

    // Apply background color to body for immediate visual feedback
    document.body.style.backgroundColor = theme.backgroundColor || '#0F0F1A'
    document.body.style.color = theme.textColor || '#F8FAFC'

    // Zinc color scale for grays - inverted for dark mode
    root.style.setProperty('--zinc-50', isDark ? '#09090B' : '#FAFAFA')
    root.style.setProperty('--zinc-100', isDark ? '#18181B' : '#F4F4F5')
    root.style.setProperty('--zinc-200', isDark ? '#27272A' : '#E4E4E7')
    root.style.setProperty('--zinc-300', isDark ? '#3F3F46' : '#D4D4D8')
    root.style.setProperty('--zinc-400', isDark ? '#52525B' : '#A1A1AA')
    root.style.setProperty('--zinc-500', isDark ? '#71717A' : '#71717A')
    root.style.setProperty('--zinc-600', isDark ? '#A1A1AA' : '#52525B')
    root.style.setProperty('--zinc-700', isDark ? '#D4D4D8' : '#3F3F46')
    root.style.setProperty('--zinc-800', isDark ? '#E4E4E7' : '#27272A')
    root.style.setProperty('--zinc-900', isDark ? '#F4F4F5' : '#18181B')
    root.style.setProperty('--zinc-950', isDark ? '#FAFAFA' : '#09090B')

    // Sky color scale for primary
    root.style.setProperty('--sky-50', isDark ? '#082F49' : '#F0F9FF')
    root.style.setProperty('--sky-100', isDark ? '#0C4A6E' : '#E0F2FE')
    root.style.setProperty('--sky-200', isDark ? '#075985' : '#BAE6FD')
    root.style.setProperty('--sky-300', isDark ? '#0369A1' : '#7DD3FC')
    root.style.setProperty('--sky-400', isDark ? '#0284C7' : '#38BDF8')
    root.style.setProperty('--sky-500', isDark ? '#0EA5E9' : '#0EA5E9')
    root.style.setProperty('--sky-600', isDark ? '#0284C7' : '#0284C7')
    root.style.setProperty('--sky-700', isDark ? '#0369A1' : '#0369A1')
    root.style.setProperty('--sky-800', isDark ? '#075985' : '#075985')
    root.style.setProperty('--sky-900', isDark ? '#0C4A6E' : '#0C4A6E')

    // Border radius
    root.style.setProperty('--border-radius', theme.borderRadius)

    // Apply font family
    if (theme.fontFamily) {
      root.style.setProperty('--font-sans', theme.fontFamily)
      document.body.style.fontFamily = theme.fontFamily
    }

    // Inject custom CSS if provided
    let customStyleElement = document.getElementById('custom-theme-styles')
    if (theme.customCSS) {
      if (!customStyleElement) {
        customStyleElement = document.createElement('style')
        customStyleElement.id = 'custom-theme-styles'
        document.head.appendChild(customStyleElement)
      }
      customStyleElement.textContent = theme.customCSS
    } else if (customStyleElement) {
      customStyleElement.remove()
    }
  }

  // Apply theme immediately on mount and when config changes
  useLayoutEffect(() => {
    applyTheme()
  }, [config.theme, isSetupPage])

  // Also apply on regular effect for safety
  useEffect(() => {
    applyTheme()
  }, [config.theme, setTheme, isSetupPage])

  // Handle branding changes like favicon and document title
  useEffect(() => {
    const { branding } = config

    // Update document title
    if (branding.appName) {
      document.title = `${branding.appName} - Setup`
    }

    // Update favicon - immediately apply changes
    if (branding.favicon) {
      let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (!faviconLink) {
        faviconLink = document.createElement('link')
        faviconLink.rel = 'icon'
        document.head.appendChild(faviconLink)
      }
      // Force refresh by adding timestamp
      const url = branding.favicon.startsWith('data:')
        ? branding.favicon
        : `${branding.favicon}?t=${Date.now()}`
      faviconLink.href = url
    }
  }, [config.branding])

  return null // This component doesn't render anything
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0'
}
