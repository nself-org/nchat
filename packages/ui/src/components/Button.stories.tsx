import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
    children: { control: 'text' },
    className: { control: 'text' },
  },
}

export default meta

type Story = StoryObj<typeof Button>

export const Default: Story = { args: { children: 'Click me' } }
export const WithHandler: Story = { args: { children: 'Save', onClick: () => {} } }
export const CustomClass: Story = { args: { children: 'Styled', className: 'text-sky-400' } }
export const Empty: Story = {}
