# @nself-chat/ui

Stub React component library for the nchat monorepo. Components are thin placeholders.
Full port from `frontend/src/components/` happens in S05.

## Usage

Consumer apps supply Tailwind CSS — do NOT add a `tailwind.config.*` here.
The consumer's Tailwind config must include this package's `src/` in its `content` glob.

## Components (stubs)

- `Button` — basic clickable element
- `Avatar` — user/channel avatar image
- `MessageBubble` — single chat message display
- `ChannelListItem` — sidebar channel entry

## Utilities

- `cn(...inputs)` — Tailwind class merger (`clsx` + `tailwind-merge`)
