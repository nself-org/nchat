/**
 * @nself-chat/ui Tailwind CSS Preset
 *
 * Shared design tokens for nchat desktop, mobile, and frontend consumers.
 * Usage: require('@nself-chat/ui/tailwind.preset') in tailwind.config.ts
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      mobile: { max: '767px' },
      tablet: { min: '768px', max: '1023px' },
      desktop: { min: '1024px' },
      touch: { raw: '(hover: none)' },
      pointer: { raw: '(hover: hover)' },
      portrait: { raw: '(orientation: portrait)' },
      landscape: { raw: '(orientation: landscape)' },
      standalone: { raw: '(display-mode: standalone)' },
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        border: 'var(--zinc-200)',
        input: 'var(--zinc-200)',
        ring: 'var(--sky-500)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
        shimmer: { '100%': { transform: 'translateX(100%)' } },
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      spacing: {
        'safe-top': 'var(--sat, 0px)',
        'safe-right': 'var(--sar, 0px)',
        'safe-bottom': 'var(--sab, 0px)',
        'safe-left': 'var(--sal, 0px)',
        touch: '44px',
        'touch-lg': '48px',
      },
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
};
