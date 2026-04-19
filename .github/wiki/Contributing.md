# Contributing to ɳChat

Thank you for your interest in contributing to **ɳChat**! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [License](#license)

---

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive to all contributors
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

- **Node.js 20+** - Use the version specified in `.node-version`
- **pnpm 9.15.4+** - Install with `npm install -g pnpm`
- **Docker** (optional) - For running backend services locally

### Local Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/nself-chat.git
cd nself-chat

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Start development server
pnpm dev
```

Visit **http://localhost:3000** to see the application running.

### With Backend Services

To run with full backend (PostgreSQL, Hasura, Auth, Storage):

```bash
# Option 1: Using nself CLI (recommended)
cd .backend
nself start

# Option 2: Using Docker Compose
docker-compose up -d
```

---

## Development Workflow

### Branch Naming Convention

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or fixes
- `chore/description` - Build/tooling changes

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes
- `perf`: Performance improvements

**Examples:**

```
feat(chat): add message reactions
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
```

---

## Code Standards

### TypeScript

- Use **TypeScript** for all new code
- Enable strict mode (`"strict": true` in tsconfig.json)
- Define proper types/interfaces (avoid `any`)
- Use proper return types for functions

### React Components

```typescript
// ✅ Good - Functional component with proper types
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  onClick?: () => void
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return <button className={cn(variant)} onClick={onClick}>{children}</button>
}

// ❌ Bad - No types, inline styles
export function Button(props) {
  return <button style={{ color: 'red' }}>{props.children}</button>
}
```

### File Organization

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components (buttons, inputs, etc.)
│   └── [feature]/   # Feature-specific components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and helpers
├── contexts/        # React contexts
├── services/        # API and service integrations
├── types/           # TypeScript type definitions
└── graphql/         # GraphQL queries and mutations
```

### Styling

- Use **Tailwind CSS** utility classes
- Use **CVA** (class-variance-authority) for component variants
- Use **cn()** helper for conditional classes
- Avoid inline styles

```typescript
// ✅ Good
<div className={cn('rounded-lg p-4', isActive && 'bg-primary')}>

// ❌ Bad
<div style={{ borderRadius: '8px', padding: '16px' }}>
```

### State Management

- Use **Zustand** for global state
- Use **React Context** for feature-specific state
- Use **Apollo Client** for GraphQL data
- Keep state as local as possible

---

## Testing Requirements

### Running Tests

```bash
# Unit/integration tests (Jest)
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report

# E2E tests (Playwright)
pnpm test:e2e          # Run E2E tests
pnpm test:e2e:ui       # Interactive UI mode

# Type checking
pnpm type-check        # Check TypeScript types

# Linting
pnpm lint              # Check for errors
pnpm lint:fix          # Auto-fix issues

# Format checking
pnpm format:check      # Check formatting
pnpm format            # Auto-format files
```

### Test Coverage Requirements

- **Minimum 80% coverage** for new code
- All bug fixes must include regression tests
- Critical features require E2E tests

### Writing Tests

```typescript
// Component test example
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    screen.getByText('Click me').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

---

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main:

   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks**:

   ```bash
   pnpm check-all
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

### PR Title Format

Use the same format as commit messages:

```
feat(chat): add message reactions
fix(auth): resolve login redirect issue
```

### PR Description Template

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. At least **one approval** required from maintainers
3. **All conversations resolved** before merging
4. Merges use **squash and merge** strategy

---

## Issue Guidelines

### Creating Issues

Use the appropriate issue template:

- **Bug Report** - For reporting bugs
- **Feature Request** - For suggesting new features
- **Documentation** - For documentation improvements
- **Question** - For asking questions

### Issue Title Format

Be specific and descriptive:

```
✅ Good:
- "Chat: Messages not loading in Safari 16"
- "Feature: Add message scheduling"
- "Docs: Update deployment guide for Kubernetes"

❌ Bad:
- "Bug"
- "Feature request"
- "Help needed"
```

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check documentation** for answers
3. **Try latest version** to see if already fixed

---

## Development Commands Reference

```bash
# Development
pnpm dev                  # Start dev server
pnpm dev:turbo           # Start with Turbopack

# Building
pnpm build               # Production build
pnpm build:analyze       # Build with bundle analyzer
pnpm build:docker        # Build Docker image

# Testing
pnpm test                # Run Jest tests
pnpm test:e2e            # Run Playwright tests
pnpm test:coverage       # Test with coverage

# Code Quality
pnpm lint                # Run ESLint
pnpm lint:fix            # Fix linting issues
pnpm format              # Format with Prettier
pnpm type-check          # Check TypeScript types

# Validation
pnpm check-all           # Run all checks
pnpm validate            # Type-check, lint, test, build

# Backend (nself CLI)
pnpm backend:start       # Start backend services
pnpm backend:stop        # Stop backend services
pnpm backend:status      # Check service status

# Database
pnpm db:migrate          # Run migrations
pnpm db:seed             # Seed database
pnpm db:types            # Generate TypeScript types
```

---

## Project Structure Overview

```
nself-chat/
├── .backend/                # nself CLI backend (gitignored)
├── .github/                # GitHub workflows and templates
├── deploy/                 # Deployment configurations
├── docs/                   # Documentation
├── e2e/                    # End-to-end tests
├── platforms/              # Platform-specific builds
│   ├── capacitor/         # iOS/Android (Capacitor)
│   ├── electron/          # Desktop (Electron)
│   ├── tauri/             # Desktop (Tauri)
│   └── react-native/      # Mobile (React Native)
├── public/                 # Static assets
├── scripts/                # Build and utility scripts
├── src/
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── graphql/           # GraphQL operations
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities and helpers
│   ├── providers/         # React providers
│   ├── services/          # API services
│   ├── stores/            # Zustand stores
│   └── types/             # TypeScript types
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md              # Project overview
```

---

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript 5.7
- **Backend**: nself CLI (PostgreSQL + Hasura + Nhost Auth)
- **State**: Zustand + Apollo Client
- **UI**: Radix UI + Tailwind CSS + CVA
- **Real-time**: Socket.io + GraphQL subscriptions
- **Testing**: Jest + Playwright
- **CI/CD**: GitHub Actions

### Key Patterns

1. **Config-First**: All behavior controlled via `AppConfig`
2. **CVA Pattern**: Component variants with `class-variance-authority`
3. **Provider Stack**: Nhost → AppConfig → Theme → Apollo → Auth
4. **Dual Auth**: Development (FauxAuth) and Production (Nhost)
5. **LocalStorage-First**: Config loads from localStorage, syncs with DB

---

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Search existing issues or create new one
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community server (link in README)

---

## License

By contributing to ɳChat, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](./LICENSE) for details.

---

## Recognition

Contributors will be recognized in:

- `CHANGELOG.md` for each release
- GitHub contributors page
- Project website (if applicable)

Thank you for contributing to ɳChat! 🎉
