import type { Meta, StoryObj } from '@storybook/react'
import { Badge, UnreadBadge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
    dot: { control: 'boolean' },
    children: { control: 'text' },
    className: { control: 'text' },
  },
}

export default meta

type Story = StoryObj<typeof Badge>

export const Default: Story = { args: { children: 'Online' } }
export const Blue: Story = { args: { variant: 'blue', children: 'Info' } }
export const Green: Story = { args: { variant: 'green', children: 'Active' } }
export const Red: Story = { args: { variant: 'red', children: 'Error' } }
export const Yellow: Story = { args: { variant: 'yellow', children: 'Warning' } }
export const Purple: Story = { args: { variant: 'purple', children: 'Premium' } }
export const WithDot: Story = { args: { variant: 'green', dot: true, children: 'Online' } }
export const Small: Story = { args: { size: 'sm', children: 'Tiny' } }

export const UnreadCount: StoryObj<typeof UnreadBadge> = {
  render: () => <UnreadBadge count={5} />,
  name: 'UnreadBadge / Count',
}

export const UnreadOverflow: StoryObj<typeof UnreadBadge> = {
  render: () => <UnreadBadge count={150} />,
  name: 'UnreadBadge / 99+',
}
