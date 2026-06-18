/**
 * Purpose:    Tailwind config for the ɳChat Vite SPA. Logical-property friendly (RTL-ready).
 * Constraints:Use logical utilities (ms-/me-/ps-/pe-/start-/end-) in new code per canonical-patterns §10.
 * SOT:        F-NCHAT-TAILWIND-01
 */
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
