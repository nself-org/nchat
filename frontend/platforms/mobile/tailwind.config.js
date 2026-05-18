/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../../packages/ui/tailwind.preset.cjs')],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    '../../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
