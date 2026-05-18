# Accessibility Components

This directory contains reusable accessibility components for nself-chat.

---

## Components

### AccessibilityMenu

Quick access dropdown menu for common accessibility settings.

**Location**: `./AccessibilityMenu.tsx`

**Usage**:

```tsx
import { AccessibilityMenu } from '@/components/accessibility/AccessibilityMenu';

// Icon button (default)
<AccessibilityMenu variant="icon" size="sm" />

// Full button with text
<AccessibilityMenu variant="button" size="default" />
```

**Features**:

- Theme toggle (light/dark)
- Font size adjustment
- High contrast mode
- Reduce motion toggle
- Screen reader mode
- Keyboard shortcuts toggle

**Keyboard Shortcut**: `Cmd/Ctrl + Shift + A`

---

### SkipLinks

Navigation skip links for keyboard users.

**Location**: `./skip-links.tsx`

**Usage**:

```tsx
import { SkipLinks } from '@/components/accessibility/skip-links';

// Default skip links
<SkipLinks />

// Custom skip links
<SkipLinks
  links={[
    { id: 'skip-1', label: 'Skip to content', targetId: 'main' },
    { id: 'skip-2', label: 'Skip to nav', targetId: 'nav' },
  ]}
/>
```

**Default Links**:

1. Skip to main content
2. Skip to sidebar
3. Skip to message input

---

### LiveRegion

ARIA live region for screen reader announcements.

**Location**: `./live-region.tsx`

**Usage**:

```tsx
import {
  LiveRegion,
  useAnnouncer,
} from "@/components/accessibility/live-region";

// Direct usage
<LiveRegion
  message="New message received"
  politeness="polite"
  clearOnAnnounce
/>;

// Using hook (recommended)
function MyComponent() {
  const { announce } = useAnnouncer();

  const handleSuccess = () => {
    announce("Action completed successfully", "polite");
  };

  const handleError = () => {
    announce("An error occurred", "assertive");
  };
}
```

**Politeness Levels**:

- `polite` - Wait for user to pause before announcing
- `assertive` - Interrupt user immediately
- `off` - Don't announce

---

### VisuallyHidden

Hide content visually while keeping it accessible to screen readers.

**Location**: `./visually-hidden.tsx`

**Usage**:

```tsx
import { VisuallyHidden } from '@/components/accessibility/visually-hidden';

// Basic usage
<VisuallyHidden>
  Additional context for screen readers
</VisuallyHidden>

// Custom element
<VisuallyHidden as="div">
  Hidden content
</VisuallyHidden>

// Show on focus (for skip links)
<VisuallyHidden showOnFocus>
  Skip to main content
</VisuallyHidden>

// Input hidden but accessible
<VisuallyHiddenInput
  type="checkbox"
  aria-label="Select item"
/>
```

**Common Use Cases**:

- Additional context for screen readers
- Skip links
- Hidden form labels
- Icon button labels

---

### FocusTrap

Trap focus within a component (for modals, dropdowns).

**Location**: `./focus-trap.tsx`

**Usage**:

```tsx
import { FocusTrap } from "@/components/accessibility/focus-trap";
<FocusTrap active={isOpen} restoreFocus>
  <Modal>{/* Modal content */}</Modal>
</FocusTrap>;
```

**Props**:

- `active` - Whether focus trap is active
- `restoreFocus` - Restore focus when deactivated
- `initialFocus` - Element to focus on activation
- `fallbackFocus` - Element to focus if initialFocus not found

---

### AccessibleIcon

Icon with proper accessibility attributes.

**Location**: `./accessible-icon.tsx`

**Usage**:

```tsx
import { AccessibleIcon } from '@/components/accessibility/accessible-icon';

// Decorative icon (hidden from screen readers)
<AccessibleIcon label="">
  <TrashIcon />
</AccessibleIcon>

// Meaningful icon
<AccessibleIcon label="Delete message">
  <TrashIcon />
</AccessibleIcon>
```

**When to Use**:

- Icons that convey meaning should have labels
- Purely decorative icons should have empty label
- Icons in buttons need labels (unless button has text)

---

## Hooks

### useKeyboardShortcuts

Manage global keyboard shortcuts.

**Location**: `@/hooks/use-keyboard-shortcuts`

**Usage**:

```tsx
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

function MyComponent() {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
    enabled: true,
    ignoreInputFields: true,
  });

  useEffect(() => {
    const shortcut = registerShortcut({
      id: "open-modal",
      keys: ["Cmd", "K"],
      description: "Open modal",
      handler: () => setIsOpen(true),
      preventDefault: true,
      category: "Actions",
    });

    return () => unregisterShortcut(shortcut.id);
  }, []);
}
```

**Features**:

- Cross-platform (Cmd on Mac, Ctrl on Windows/Linux)
- Automatic input field detection
- Category grouping
- Enable/disable individual shortcuts

---

### useFocusManagement

Manage focus state and behavior.

**Location**: `@/hooks/use-focus-management`

**Usage**:

```tsx
import { useFocusManagement } from "@/hooks/use-focus-management";

function Modal() {
  const { focusRef, setFocus } = useFocusManagement({
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true,
  });

  return <div ref={focusRef}>{/* Modal content */}</div>;
}
```

**Options**:

- `autoFocus` - Focus on mount
- `restoreFocus` - Restore focus on unmount
- `trapFocus` - Trap focus within element

---

### useRovingTabIndex

Arrow key navigation in lists.

**Location**: `@/hooks/use-focus-management`

**Usage**:

```tsx
import { useRovingTabIndex } from "@/hooks/use-focus-management";

function ChannelList({ channels }) {
  const { containerRef, currentIndex, focusElement } = useRovingTabIndex({
    orientation: "vertical",
    loop: true,
  });

  return (
    <div ref={containerRef}>
      {channels.map((channel, index) => (
        <a
          key={channel.id}
          href={`/channel/${channel.id}`}
          tabIndex={index === 0 ? 0 : -1}
        >
          {channel.name}
        </a>
      ))}
    </div>
  );
}
```

**Options**:

- `orientation` - `vertical`, `horizontal`, or `both`
- `loop` - Loop back to start/end
- `onIndexChange` - Callback when index changes

---

## Best Practices

### 1. Semantic HTML First

Always use semantic HTML before adding ARIA:

```tsx
// ❌ Bad
<div onClick={handleClick} role="button">Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>
```

### 2. Accessible Names

All interactive elements need accessible names:

```tsx
// ❌ Bad - icon button without label
<button>
  <TrashIcon />
</button>

// ✅ Good - with aria-label
<button aria-label="Delete message">
  <TrashIcon />
</button>

// ✅ Better - with VisuallyHidden text
<button>
  <TrashIcon />
  <VisuallyHidden>Delete message</VisuallyHidden>
</button>
```

### 3. Form Labels

All form inputs need labels:

```tsx
// ❌ Bad - placeholder as label
<input type="email" placeholder="Email" />

// ✅ Good - with label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ✅ Also good - with aria-label
<input type="email" aria-label="Email address" />
```

### 4. Error Messages

Link error messages to inputs:

```tsx
// ✅ Good
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && (
  <span id="email-error" role="alert">
    {error}
  </span>
)}
```

### 5. Loading States

Announce loading states:

```tsx
// ✅ Good
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? "Loading..." : "Submit"}
</button>;

// ✅ Better - with announcement
const { announce } = useAnnouncer();

const handleSubmit = async () => {
  announce("Submitting form", "polite");
  await submit();
  announce("Form submitted successfully", "polite");
};
```

### 6. Focus Management

Manage focus in modals:

```tsx
// ✅ Good
<Dialog open={isOpen}>
  <DialogContent
    onOpenAutoFocus={(e) => {
      // Focus first input
      e.preventDefault();
      firstInputRef.current?.focus();
    }}
    onCloseAutoFocus={(e) => {
      // Focus trigger button
      e.preventDefault();
      triggerRef.current?.focus();
    }}
  >
    {/* Content */}
  </DialogContent>
</Dialog>
```

---

## Testing Checklist

Before committing changes:

- [ ] All buttons have accessible names
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Error messages are linked to inputs
- [ ] Loading states are announced
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Color is not the only indicator
- [ ] Modal focus is managed
- [ ] Touch targets are 44×44px

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)
- [Full Accessibility Guide](/docs/guides/accessibility.md)

---

**Last Updated**: January 31, 2026
