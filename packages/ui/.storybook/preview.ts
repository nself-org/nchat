import type { Preview } from '@storybook/react'

/**
 * Storybook global preview configuration for @nself-chat/ui.
 *
 * Applies nSelf dark theme (gray-950 background, sky-500 accent) to all stories.
 */

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#030712' },
        { name: 'light', value: '#ffffff' },
        { name: 'gray', value: '#1f2937' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
}

export default preview
