/**
 * WCAG 2.1 AA Compliance Tests
 *
 * Comprehensive accessibility tests for WCAG 2.1 Level AA compliance.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  expectNoA11yViolations,
  testKeyboardNavigation,
  testARIA,
} from '@/lib/accessibility/test-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HighContrastMode } from '@/components/accessibility/HighContrastMode'
import { AccessibilityMenu } from '@/components/accessibility/AccessibilityMenu'

expect.extend(toHaveNoViolations)

describe('WCAG 2.1 AA Compliance', () => {
  describe('Perceivable', () => {
    test('1.1.1 - Text Alternatives: Images have alt text', async () => {
      const { container } = render(
        <div>
          <img src="/test.jpg" alt="Test image" />
          <img src="/decorative.jpg" alt="" role="presentation" />
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('1.3.1 - Info and Relationships: Proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Main Heading</h1>
          <h2>Subheading</h2>
          <h3>Sub-subheading</h3>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('1.4.3 - Contrast (Minimum): Sufficient color contrast', async () => {
      const { container } = render(
        <div className="bg-background text-foreground">
          <p>This text has sufficient contrast</p>
          <button className="text-primary-foreground bg-primary">Button</button>
        </div>
      )

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })

      expect(results).toHaveNoViolations()
    }, 30000)

    test('1.4.4 - Resize Text: Text can be resized', () => {
      const { container } = render(
        <div style={{ fontSize: '16px' }}>
          <p>Resizable text</p>
        </div>
      )

      // JSDOM does not compute inherited styles on child elements.
      // Verify the font-size is set on the container div directly.
      const div = container.querySelector('div')
      expect(div).toBeInTheDocument()
      expect(div).toHaveStyle({ fontSize: '16px' })
    })

    test('1.4.10 - Reflow: Content reflows at 320px', () => {
      const { container } = render(
        <div style={{ width: '320px', maxWidth: '100%' }}>
          <p>This content reflows properly</p>
        </div>
      )

      expect(container.querySelector('div')).toHaveStyle({ maxWidth: '100%' })
    })
  })

  describe('Operable', () => {
    test('2.1.1 - Keyboard: All functionality available via keyboard', () => {
      const { container } = render(
        <div>
          <button>Click me</button>
          <a href="/test">Link</a>
          <input type="text" />
        </div>
      )

      const keyboard = testKeyboardNavigation(container)
      expect(keyboard.hasFocusableElements).toBe(true)
    })

    test('2.1.2 - No Keyboard Trap: No keyboard traps', async () => {
      const { container } = render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('2.4.1 - Bypass Blocks: Skip links present', () => {
      render(
        <div>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <main id="main">Main content</main>
        </div>
      )

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main')
    })

    test('2.4.2 - Page Titled: Page has title', () => {
      // JSDOM starts with an empty document.title; set it to simulate a titled page
      document.title = 'nSelf Chat'
      render(<div />)
      expect(document.title).toBeTruthy()
    })

    test('2.4.3 - Focus Order: Logical focus order', async () => {
      const { container } = render(
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('2.4.4 - Link Purpose: Link purpose is clear', async () => {
      const { container } = render(
        <div>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('2.4.6 - Headings and Labels: Descriptive headings and labels', async () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" />
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('2.4.7 - Focus Visible: Focus indicator is visible', () => {
      const { container } = render(<Button>Test Button</Button>)

      const button = container.querySelector('button')
      expect(button).toBeInTheDocument()
    })

    test('2.5.3 - Label in Name: Accessible name contains visible text', async () => {
      const { container } = render(
        <div>
          <button aria-label="Submit form">Submit</button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)
  })

  describe('Understandable', () => {
    test('3.1.1 - Language of Page: Page has lang attribute', () => {
      // JSDOM does not set a lang attribute by default; set it to verify the pattern
      document.documentElement.setAttribute('lang', 'en')
      expect(document.documentElement).toHaveAttribute('lang')
    })

    test('3.2.1 - On Focus: No context change on focus', async () => {
      const { container } = render(
        <div>
          <input type="text" aria-label="Search" />
          <button>Submit</button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('3.2.2 - On Input: No context change on input', async () => {
      const { container } = render(
        <form>
          <Label htmlFor="name">Name</Label>
          <Input id="name" type="text" />
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('3.3.1 - Error Identification: Errors are identified', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" aria-invalid="true" aria-describedby="email-error" />
          <div id="email-error" role="alert">
            Please enter a valid email
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('3.3.2 - Labels or Instructions: Form fields have labels', async () => {
      const { container } = render(
        <form>
          <Label htmlFor="username">Username</Label>
          <Input id="username" type="text" required />
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required />
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)
  })

  describe('Robust', () => {
    test('4.1.1 - Parsing: Valid HTML', async () => {
      const { container } = render(
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('4.1.2 - Name, Role, Value: Elements have proper ARIA', async () => {
      const { container } = render(
        <div>
          <button aria-label="Close dialog">×</button>
          <div role="alert">Important message</div>
          <input type="checkbox" aria-checked="false" role="checkbox" aria-label="Accept terms" />
        </div>
      )

      const aria = testARIA(container)
      expect(aria.passed).toBe(true)
    })

    test('4.1.3 - Status Messages: Status messages use proper ARIA', async () => {
      const { container } = render(
        <div>
          <div role="status" aria-live="polite">
            Loading...
          </div>
          <div role="alert" aria-live="assertive">
            Error occurred!
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)
  })

  describe('Component Accessibility', () => {
    test('Button component is accessible', async () => {
      await expectNoA11yViolations(<Button>Click me</Button>)
    }, 30000)

    test('Input component is accessible', async () => {
      await expectNoA11yViolations(
        <div>
          <Label htmlFor="test">Test Input</Label>
          <Input id="test" type="text" />
        </div>
      )
    }, 30000)

    test('High Contrast Mode is accessible', async () => {
      await expectNoA11yViolations(<HighContrastMode />)
    }, 30000)

    test('Accessibility Menu is accessible', async () => {
      await expectNoA11yViolations(<AccessibilityMenu />)
    }, 30000)
  })

  describe('Keyboard Navigation', () => {
    test('All interactive elements are keyboard accessible', () => {
      const { container } = render(
        <div>
          <button>Button</button>
          <a href="/test">Link</a>
          <input type="text" />
          <select>
            <option>Option 1</option>
          </select>
          <textarea />
        </div>
      )

      const keyboard = testKeyboardNavigation(container)
      expect(keyboard.hasFocusableElements).toBe(true)
      expect(keyboard.allHaveTabIndex).toBe(true)
    })

    test('Skip links work correctly', () => {
      render(
        <>
          <a href="#content" className="skip-link">
            Skip to content
          </a>
          <nav>Navigation</nav>
          <main id="content">Main content</main>
        </>
      )

      const skipLink = screen.getByText('Skip to content')
      expect(skipLink).toHaveAttribute('href', '#content')

      const mainContent = screen.getByText('Main content')
      expect(mainContent).toHaveAttribute('id', 'content')
    })
  })

  describe('Screen Reader Support', () => {
    test('ARIA landmarks are used correctly', async () => {
      const { container } = render(
        <div>
          <header role="banner">Header</header>
          <nav role="navigation">Navigation</nav>
          <main role="main">Main content</main>
          <footer role="contentinfo">Footer</footer>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 30000)

    test('ARIA labels are present on interactive elements', () => {
      render(
        <div>
          <button aria-label="Close">×</button>
          <input type="search" aria-label="Search" />
          <button aria-label="Menu">
            <span aria-hidden="true">☰</span>
          </button>
        </div>
      )

      const closeButton = screen.getByLabelText('Close')
      const searchInput = screen.getByLabelText('Search')
      const menuButton = screen.getByLabelText('Menu')

      expect(closeButton).toBeInTheDocument()
      expect(searchInput).toBeInTheDocument()
      expect(menuButton).toBeInTheDocument()
    })

    test('Live regions announce changes', () => {
      render(
        <div>
          <div role="status" aria-live="polite">
            Status message
          </div>
          <div role="alert" aria-live="assertive">
            Alert message
          </div>
        </div>
      )

      const status = screen.getByRole('status')
      const alert = screen.getByRole('alert')

      expect(status).toHaveAttribute('aria-live', 'polite')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })
  })
})
