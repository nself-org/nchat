import type { Meta, StoryObj } from '@storybook/react'
import { Spinner, Skeleton } from './spinner'

// ============================================================================
// Spinner
// ============================================================================

const spinnerMeta: Meta<typeof Spinner> = {
  title: 'Primitives/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    label: { control: 'text' },
    className: { control: 'text' },
  },
}

export default spinnerMeta

type Story = StoryObj<typeof Spinner>

export const Default: Story = {}

export const ExtraSmall: Story = { args: { size: 'xs' } }
export const Small: Story = { args: { size: 'sm' } }
export const Medium: Story = { args: { size: 'md' } }
export const Large: Story = { args: { size: 'lg' } }

export const CustomLabel: Story = {
  args: { label: 'Sending message…' },
}

// ============================================================================
// Skeleton
// ============================================================================

export const SkeletonSingle: StoryObj<typeof Skeleton> = {
  render: () => <Skeleton className="h-4 w-48" />,
  name: 'Skeleton / Single block',
}

export const SkeletonCircle: StoryObj<typeof Skeleton> = {
  render: () => <Skeleton circle className="h-10 w-10" />,
  name: 'Skeleton / Circle avatar',
}

export const SkeletonMultiLine: StoryObj<typeof Skeleton> = {
  render: () => <Skeleton lines={4} />,
  name: 'Skeleton / Multi-line text',
}
