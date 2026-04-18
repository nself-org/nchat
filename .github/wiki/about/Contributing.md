# Contributing to ɳChat

Thank you for your interest in contributing to ɳChat! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for everyone. Please be respectful of differing viewpoints and experiences.

### Our Standards

✅ **Encouraged Behavior**:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

❌ **Unacceptable Behavior**:

- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 20+** installed
- **pnpm 9+** package manager
- **Git** for version control
- **Docker** (optional, for backend services)
- A **code editor** (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR-USERNAME/nself-chat.git
   cd nself-chat
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/nself-org/nchat.git
   ```

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm dev
```

The app will be available at http://localhost:3000

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions or fixes
- `refactor/` - Code refactoring
- `perf/` - Performance improvements
- `chore/` - Build process or tooling changes

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run type check
pnpm type-check

# Run tests
pnpm test

# Run linter
pnpm lint

# Build production bundle
pnpm build
```

All checks must pass before submitting a PR.

### 4. Commit Your Changes

Follow our [commit message guidelines](#commit-message-guidelines):

```bash
git add .
git commit -m "feat(chat): add message reactions feature"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

---

## Coding Standards

### TypeScript

- **Strict Mode**: Enable strict TypeScript checks
- **Type Safety**: Avoid `any` types - use proper typing
- **Interfaces**: Use interfaces for object shapes
- **Enums**: Use const enums for better performance

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  email: string
}

// ❌ Bad
const user: any = { id: '1', name: 'John' }
```

### React Components

- **Functional Components**: Use function declarations, not arrow functions for components
- **Hooks**: Follow React Hooks rules
- **Props**: Define prop types with interfaces
- **File Structure**: One component per file

```typescript
// ✅ Good
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={variant}>
      {label}
    </button>
  )
}

// ❌ Bad
export const Button = (props: any) => {
  return <button>{props.label}</button>
}
```

### File Organization

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── chat/        # Chat-specific components
│   └── ...
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
├── stores/          # Zustand stores
├── types/           # TypeScript type definitions
├── contexts/        # React contexts
└── graphql/         # GraphQL queries/mutations
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useChannels.ts`)
- **Files**: kebab-case for non-components (`auth-utils.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
- **CSS Classes**: kebab-case with BEM where appropriate

### Code Style

- **Line Length**: 100 characters max (enforced by Prettier)
- **Indentation**: 2 spaces
- **Semicolons**: Not required (handled by Prettier)
- **Quotes**: Single quotes for strings
- **Trailing Commas**: Yes (handled by Prettier)

```typescript
// ✅ Good
const config = {
  name: 'ɳChat',
  version: '0.3.0',
  features: ['messaging', 'calls', 'search'],
}

// ❌ Bad
const config = {
  name: 'ɳChat',
  version: '0.3.0',
  features: ['messaging', 'calls', 'search'],
}
```

### Import Order

1. React and Next.js imports
2. Third-party libraries
3. Internal components
4. Internal utilities
5. Types
6. Styles

```typescript
import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { User } from '@/types/user'

import './styles.css'
```

---

## Testing Requirements

### Unit Tests

Every new feature should include unit tests:

```typescript
// src/hooks/__tests__/use-channels.test.ts
import { renderHook } from '@testing-library/react'
import { useChannels } from '../use-channels'

describe('useChannels', () => {
  it('should fetch channels on mount', async () => {
    const { result } = renderHook(() => useChannels())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.channels).toHaveLength(3)
    })
  })
})
```

### Integration Tests

For complex features, add integration tests:

```typescript
// src/__tests__/integration/messaging.test.ts
describe('Messaging Flow', () => {
  it('should send and receive messages', async () => {
    // Test implementation
  })
})
```

### E2E Tests

For critical user flows, add E2E tests with Playwright:

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test'

test('user can send a message', async ({ page }) => {
  await page.goto('/chat/channel/general')
  await page.fill('[data-testid="message-input"]', 'Hello, world!')
  await page.click('[data-testid="send-button"]')

  await expect(page.locator('text=Hello, world!')).toBeVisible()
})
```

### Test Coverage

- **Target**: 80% code coverage minimum
- **Critical Paths**: 100% coverage required
- **Run Coverage**: `pnpm test:coverage`

---

## Pull Request Process

### Before Submitting

- [ ] Code passes `pnpm type-check`
- [ ] Tests pass `pnpm test`
- [ ] Linter passes `pnpm lint`
- [ ] Production build succeeds `pnpm build`
- [ ] Documentation updated
- [ ] docs/CHANGELOG.md updated (if applicable)
- [ ] Screenshots added (for UI changes)

### PR Title Format

Use conventional commit format:

```
feat(chat): add message reactions
fix(auth): resolve login redirect issue
docs(readme): update installation steps
test(e2e): add channel creation tests
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

How has this been tested?

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing

## Screenshots (if applicable)

Add screenshots to help explain your changes

## Checklist

- [ ] My code follows the code style of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: CI/CD runs tests, linting, and builds
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Reviewer tests functionality manually if needed
4. **Approval**: Maintainer approves PR
5. **Merge**: Maintainer merges using "Squash and Merge"

### Response Time

- **Initial Response**: Within 3 business days
- **Review Turnaround**: Within 7 business days
- **Merge Decision**: Based on review feedback

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi colons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies
- `ci`: CI/CD configuration changes
- `revert`: Reverting a previous commit

### Scopes

Common scopes:

- `chat`: Chat functionality
- `auth`: Authentication
- `settings`: Settings pages
- `admin`: Admin dashboard
- `ui`: UI components
- `a11y`: Accessibility
- `perf`: Performance
- `i18n`: Internationalization

### Examples

```bash
# Feature
feat(chat): add message threading support

# Bug fix
fix(auth): resolve token refresh race condition

# Breaking change
feat(api)!: change user profile API response format

BREAKING CHANGE: User profile endpoint now returns camelCase instead of snake_case

# Multiple changes
feat(chat): add reactions and improve message rendering

- Add emoji reaction picker
- Optimize message list virtualization
- Fix typing indicator positioning

Closes #123
```

---

## Documentation

### Code Comments

```typescript
/**
 * Fetches all channels the user has access to.
 *
 * @param userId - The ID of the user
 * @param includeArchived - Whether to include archived channels
 * @returns Array of channel objects
 * @throws {AuthError} If user is not authenticated
 */
export async function fetchChannels(userId: string, includeArchived = false): Promise<Channel[]> {
  // Implementation
}
```

### Component Documentation

````typescript
/**
 * MessageList Component
 *
 * Displays a virtualized list of messages with support for:
 * - Infinite scrolling
 * - Reactions
 * - Threading
 * - Message actions (edit, delete, pin)
 *
 * @example
 * ```tsx
 * <MessageList
 *   channelId="ch-123"
 *   onMessageClick={(msg) => console.log(msg)}
 * />
 * ```
 */
export function MessageList({ channelId, onMessageClick }: MessageListProps) {
  // Implementation
}
````

### README Updates

When adding major features, update README.md:

- Add to feature list
- Update screenshots if UI changed
- Add to quick start if setup changed

---

## Community

### Getting Help

- **GitHub Discussions**: For questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Join our community server (link in README)
- **Stack Overflow**: Tag questions with `nself-chat`

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Discord**: Real-time chat with maintainers and community
- **Twitter**: [@nself_org](https://twitter.com/nself_org) for announcements

### Contributing Beyond Code

You don't have to write code to contribute! We welcome:

- 📝 **Documentation**: Improve guides, add examples, fix typos
- 🎨 **Design**: UI/UX improvements, icons, themes
- 🐛 **Bug Reports**: Detailed bug reports help us improve
- 💡 **Feature Ideas**: Share your ideas in Discussions
- 🌍 **Translations**: Help translate ɳChat to other languages
- 📹 **Tutorials**: Create video tutorials or blog posts
- 🧪 **Testing**: Test new features and provide feedback
- 💬 **Community Support**: Help answer questions in Discussions

---

## Recognition

### Contributors

All contributors are recognized in:

- GitHub Contributors page
- CONTRIBUTORS.md (coming soon)
- Release notes for significant contributions
- Hall of Fame for exceptional contributions

### First-Time Contributors

We mark issues suitable for first-time contributors with `good first issue` label. Look for these to get started!

---

## License

By contributing to ɳChat, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

If you have questions about contributing, please:

1. Check existing GitHub Discussions
2. Ask in our Discord server
3. Open a new Discussion on GitHub

Thank you for contributing to ɳChat! 🎉
