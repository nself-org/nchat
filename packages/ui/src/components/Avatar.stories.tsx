import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    size: { control: 'number' },
    className: { control: 'text' },
  },
}

export default meta

type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    alt: 'GitHub User',
  },
}

export const Small: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    alt: 'Small Avatar',
    size: 24,
  },
}

export const Large: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    alt: 'Large Avatar',
    size: 64,
  },
}

export const Decorative: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    // no alt = empty alt = decorative
  },
}
