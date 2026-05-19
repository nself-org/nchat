import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    // Custom screens for mobile-first responsive design
    screens: {
      xs: '480px', // Extra small phones in landscape
      sm: '640px', // Small tablets, large phones
      md: '768px', // Tablets
      lg: '1024px', // Laptops
      xl: '1280px', // Desktops
      '2xl': '1536px', // Large desktops
      // Mobile-specific breakpoints
      mobile: { max: '767px' }, // Mobile only
      tablet: { min: '768px', max: '1023px' }, // Tablet only
      desktop: { min: '1024px' }, // Desktop only
      // Touch device detection
      touch: { raw: '(hover: none)' },
      pointer: { raw: '(hover: hover)' },
      // Orientation
      portrait: { raw: '(orientation: portrait)' },
      landscape: { raw: '(orientation: landscape)' },
      // PWA standalone mode
      standalone: { raw: '(display-mode: standalone)' },
    },
    extend: {
      colors: {
        // Core colors from CSS variables
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // primary must be an object so text-primary-foreground resolves to
        // --primary-foreground (#0f172a), not to the inherited body foreground
        // (#f8fafc). A flat string value means primary.foreground is undefined,
        // and Tailwind falls back to body text color — failing WCAG AA contrast.
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },

        // Zinc scale - hardcoded dark values for reliability
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },

        // Sky scale from CSS variables
        sky: {
          50: 'var(--sky-50)',
          100: 'var(--sky-100)',
          200: 'var(--sky-200)',
          300: 'var(--sky-300)',
          400: 'var(--sky-400)',
          500: 'var(--sky-500)',
          600: 'var(--sky-600)',
          700: 'var(--sky-700)',
          800: 'var(--sky-800)',
          900: 'var(--sky-900)',
        },

        // Legacy support
        border: 'var(--zinc-200)',
        input: 'var(--zinc-200)',
        ring: 'var(--sky-500)',
        muted: {
          DEFAULT: 'var(--muted)',
          // Use the CSS custom property so the foreground colour tracks the active
          // theme. The old value 'var(--zinc-600)' (#52525b) failed WCAG AA colour
          // contrast (2.26:1) against dark card backgrounds — 126 axe violations.
          // var(--muted-foreground) is defined in globals.css for each theme and
          // always satisfies the 4.5:1 minimum ratio.
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--background)',
          foreground: 'var(--foreground)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive, 0 84.2% 60.2%))',
          foreground: 'hsl(var(--destructive-foreground, 0 0% 98%))',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius)',
        lg: 'var(--border-radius)',
        md: 'calc(var(--border-radius) - 2px)',
        sm: 'calc(var(--border-radius) - 4px)',
        xl: 'calc(var(--border-radius) + 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        slide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        // Mobile animations
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s infinite',
        slide: 'slide 1s ease-in-out infinite',
        // Mobile animations
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'bounce-in': 'bounce-in 0.4s ease-out',
      },
      // Mobile-specific spacing
      spacing: {
        'safe-top': 'var(--sat, 0px)',
        'safe-right': 'var(--sar, 0px)',
        'safe-bottom': 'var(--sab, 0px)',
        'safe-left': 'var(--sal, 0px)',
        touch: '44px', // Minimum touch target size
        'touch-lg': '48px', // Comfortable touch target size
      },
      // Mobile-specific heights
      height: {
        'screen-safe': 'calc(100vh - var(--sat, 0px) - var(--sab, 0px))',
        'screen-dvh': '100dvh',
        'mobile-nav': '64px',
        'mobile-header': '56px',
      },
      minHeight: {
        touch: '44px',
        'touch-lg': '48px',
        'screen-safe': 'calc(100vh - var(--sat, 0px) - var(--sab, 0px))',
        'screen-dvh': '100dvh',
      },
      maxHeight: {
        'screen-safe': 'calc(100vh - var(--sat, 0px) - var(--sab, 0px))',
        'screen-dvh': '100dvh',
        'bottom-sheet': '85vh',
      },
      // Mobile-specific z-index
      zIndex: {
        'mobile-nav': '40',
        'mobile-header': '40',
        drawer: '50',
        'action-sheet': '50',
        overlay: '45',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
