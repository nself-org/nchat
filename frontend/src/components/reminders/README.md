# Reminders Components

Complete reminders system for nself-chat with Slack-like functionality.

## Quick Start

```tsx
import {
  RemindersList,
  SetReminderModal,
  ReminderNotificationContainer,
  MessageQuickRemind,
} from "@/components/reminders";

function MyApp() {
  return (
    <>
      {/* Notification container (add to root layout) */}
      <ReminderNotificationContainer userId={currentUser.id} />

      {/* Reminders list page */}
      <RemindersList userId={currentUser.id} />

      {/* Quick remind from message */}
      <MessageQuickRemind
        messageId={message.id}
        channelId={channel.id}
        userId={currentUser.id}
      />

      {/* Create/Edit modal */}
      <SetReminderModal
        open={isOpen}
        onOpenChange={setIsOpen}
        userId={currentUser.id}
      />
    </>
  );
}
```

## Components

### SetReminderModal

Main modal for creating and editing reminders.

**Features**:

- Quick time presets (20min, 1hr, 3hr, tomorrow, next week)
- Custom date/time picker with timezone
- Recurring reminder options (daily, weekly, monthly, yearly)
- Message preview for message reminders
- Real-time validation
- Preview panel

**Props**:

```typescript
interface SetReminderModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userId: string;
  messageId?: string;
  channelId?: string;
  initialContent?: string;
  editingReminder?: Reminder | null;
  onSuccess?: (reminder: Reminder) => void;
  onCancel?: () => void;
}
```

---

### RemindersList

Display and manage all reminders with filtering and grouping.

**Features**:

- Upcoming/Completed tabs
- Search and filter (status, type, channel)
- Group by date or channel
- Bulk actions (complete/delete multiple)
- Empty states
- Loading skeletons

**Props**:

```typescript
interface RemindersListProps {
  userId: string;
  channelId?: string;
  onEdit?: (reminder: Reminder) => void;
  onCreateNew?: () => void;
  showFilters?: boolean;
  showSearch?: boolean;
  showTabs?: boolean;
  maxHeight?: string | number;
  emptyMessage?: string;
  className?: string;
}
```

---

### ReminderItem

Individual reminder card with actions.

**Features**:

- Message preview (for message reminders)
- Quick actions (complete, edit, delete, snooze)
- Status badges
- Time display with relative/absolute
- Channel link

**Props**:

```typescript
interface ReminderItemProps {
  reminder: Reminder;
  onComplete?: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (id: string) => void;
  onSnooze?: (id: string) => void;
  isLoading?: boolean;
  showChannel?: boolean;
  compact?: boolean;
}
```

---

### ReminderNotification

Notification components for due reminders.

**Components**:

- `ReminderNotification`: Full-featured notification card
- `ReminderToast`: Toast-style notification
- `ReminderBell`: Badge icon with count
- `ReminderNotificationContainer`: Container for managing notifications

**Features**:

- Auto-show when reminder is due
- Quick actions (Complete, Snooze, Dismiss)
- Desktop notifications
- Sound alerts
- Navigate to message/channel

**Usage**:

```tsx
// Add to root layout
<ReminderNotificationContainer userId={user.id} />;

// Or use hook directly
const { activeNotification, dismissNotification } = useReminderNotifications();
```

---

### QuickRemind

Quick reminder creation from messages.

**Components**:

- `QuickRemind`: Dropdown menu with presets
- `QuickRemindButtons`: Button grid layout
- `MessageQuickRemind`: Integrated with message actions

**Features**:

- One-click reminder creation
- Preset times (20min, 1hr, 3hr, tomorrow, next week)
- Custom time option
- Message context aware

**Usage**:

```tsx
// In message dropdown
<QuickRemind
  messageId={message.id}
  channelId={channel.id}
  messageContent={message.content}
  onReminderSet={(reminder) => console.log('Set:', reminder)}
/>

// As button grid
<QuickRemindButtons
  messageId={message.id}
  userId={user.id}
/>
```

---

### ReminderTimePicker

Date and time selection with timezone support.

**Components**:

- `ReminderTimePicker`: Full picker with date, time, timezone
- `CompactTimePicker`: Compact version

**Features**:

- Calendar date picker
- Hour/minute time picker
- Timezone selector (IANA format)
- Preset quick times
- Future validation

**Props**:

```typescript
interface ReminderTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  minDate?: Date;
  showTimezone?: boolean;
  presets?: TimePreset[];
}
```

---

## Hooks

### useReminders

Main hook for reminders functionality.

```tsx
import { useReminders } from "@/lib/reminders/use-reminders";

function MyComponent() {
  const {
    // Data
    reminders,
    upcomingReminders,
    completedReminders,
    dueReminders,
    pendingCount,
    nextReminder,

    // Loading
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,

    // Actions
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    snoozeReminder,
    bulkComplete,
    bulkDelete,

    // Message-specific
    setReminderForMessage,
    hasReminderForMessage,
    getReminderForMessage,

    // UI helpers
    openReminderModal,
    closeReminderModal,
  } = useReminders({ userId: currentUser.id });

  return <div>{/* Your UI */}</div>;
}
```

---

## Store

### useReminderStore

Zustand store for global reminder state.

```tsx
import { useReminderStore } from "@/lib/reminders/reminder-store";

function MyComponent() {
  const {
    reminders,
    dueReminders,
    isModalOpen,
    filter,
    setFilter,
    openModal,
    closeModal,
  } = useReminderStore();

  return <div>{/* Your UI */}</div>;
}
```

---

## Examples

### Example 1: Message Reminder

```tsx
import { SetReminderModal } from "@/components/reminders";
import { useState } from "react";

function MessageWithReminder({ message, user }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Message {...message}>
        <button onClick={() => setShowModal(true)}>Set Reminder</button>
      </Message>

      <SetReminderModal
        open={showModal}
        onOpenChange={setShowModal}
        userId={user.id}
        messageId={message.id}
        channelId={message.channel_id}
        initialContent={message.content}
      />
    </>
  );
}
```

### Example 2: Quick Remind Menu

```tsx
import { QuickRemind } from "@/components/reminders";

function MessageActions({ message }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <QuickRemind
          messageId={message.id}
          channelId={message.channel_id}
          messageContent={message.content}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Example 3: Reminders Page

```tsx
import { RemindersList, SetReminderModal } from "@/components/reminders";
import { useState } from "react";

function RemindersPage({ user }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <h1>My Reminders</h1>

      <RemindersList
        userId={user.id}
        showFilters
        showSearch
        onEdit={(reminder) => {
          setEditing(reminder);
          setModalOpen(true);
        }}
        onCreateNew={() => setModalOpen(true)}
      />

      <SetReminderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={user.id}
        editingReminder={editing}
        onSuccess={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
```

### Example 4: Notification Container

```tsx
import { ReminderNotificationContainer } from "@/components/reminders";

function AppLayout({ children, user }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />

      {/* Add notification container */}
      <ReminderNotificationContainer
        userId={user.id}
        position="bottom-right"
        maxNotifications={3}
      />
    </div>
  );
}
```

---

## Styling

All components use Tailwind CSS and Radix UI primitives. Override styles using className prop:

```tsx
<RemindersList className="custom-reminders-list" maxHeight="800px" />
```

CSS variables for theming:

```css
:root {
  --reminder-bg: hsl(var(--background));
  --reminder-border: hsl(var(--border));
  --reminder-text: hsl(var(--foreground));
  --reminder-accent: hsl(var(--primary));
  --reminder-muted: hsl(var(--muted));
}
```

---

## Accessibility

- Full keyboard navigation
- ARIA labels and roles
- Screen reader support
- Focus management
- High contrast mode support

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Notifications require:

- `Notification API` support
- User permission

---

## TypeScript

All components are fully typed. Import types:

```tsx
import type {
  Reminder,
  ReminderDraft,
  ReminderFilter,
  RecurrenceRule,
} from "@/graphql/reminders";

import type {
  RemindersListProps,
  SetReminderModalProps,
  ReminderItemProps,
} from "@/components/reminders";
```

---

## Testing

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { SetReminderModal } from "@/components/reminders";

test("creates reminder", async () => {
  const onSuccess = jest.fn();

  render(<SetReminderModal open userId="user-1" onSuccess={onSuccess} />);

  // Enter content
  const input = screen.getByPlaceholderText("Enter your reminder...");
  fireEvent.change(input, { target: { value: "Test" } });

  // Select time
  const in1Hour = screen.getByText("In 1 hour");
  fireEvent.click(in1Hour);

  // Submit
  const submit = screen.getByText("Set Reminder");
  fireEvent.click(submit);

  // Verify
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
});
```

---

## Documentation

- [Full System Docs](../../../docs/Reminders-System.md)
- [API Reference](../../../docs/Reminders-System.md#api-reference)
- [GraphQL Schema](../../../docs/Reminders-System.md#graphql-schema)

---

## License

MIT © nself-chat
