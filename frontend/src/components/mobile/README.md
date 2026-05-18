# Mobile UI Components

Complete suite of production-ready mobile-optimized components for the nself-chat application.

## Table of Contents

- [Overview](#overview)
- [Component List](#component-list)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Component Reference](#component-reference)
- [Best Practices](#best-practices)

---

## Overview

This directory contains all mobile-specific UI components designed to provide a native-like experience on iOS and Android devices. All components follow mobile-first design principles with:

- **Touch-optimized**: Minimum 44pt (iOS) / 48dp (Android) tap targets
- **Gesture support**: Swipe, long-press, pinch-to-zoom
- **Haptic feedback**: Optional vibration feedback
- **Performance**: Virtual scrolling, optimized animations
- **Accessibility**: ARIA labels, keyboard navigation
- **Safe areas**: iPhone notch, Android camera cutout support

---

## Component List

### Core Navigation

- `MobileNav` - Bottom navigation bar
- `MobileHeader` - Top header with back button
- `MobileSidebar` - Slide-out sidebar
- `MobileDrawer` - Bottom/side drawer component

### Gestures & Interactions

- `PullToRefresh` - Pull-down to refresh
- `LongPressMenu` - Context menu on long press
- `PinchZoom` - Pinch to zoom images
- `SwipeActions` - Swipe to reveal actions
- `GestureNavigation` - Swipe-based navigation
- `EdgeSwipe` - Screen edge swipe detection

### Input Components

- `MobileMessageInput` - Chat message input
- `MobileDatePicker` - Touch-friendly date picker
- `MobileTimePicker` - Touch-friendly time picker
- `TouchOptimized` - Touch-optimized form controls

### Layout & Display

- `VirtualMessageList` - High-performance message list
- `BottomSheet` - Modal bottom sheet
- `SafeAreaView` - Safe area handling
- `KeyboardAvoidingView` - Keyboard avoidance
- `SkeletonLoader` - Loading placeholders

### Channel & Messages

- `MobileChannelView` - Channel message view
- `MobileActionSheet` - Action sheet modal

---

## Installation

All components are already installed as part of the nself-chat project. They use the following dependencies:

```json
{
  "framer-motion": "^11.18.0",
  "@tanstack/react-virtual": "^3.13.0",
  "lucide-react": "^0.469.0",
  "@radix-ui/react-*": "Various"
}
```

---

## Usage Examples

### Basic Touch-Optimized Button

```tsx
import { TouchButton } from "@/components/mobile";

function MyComponent() {
  return (
    <TouchButton
      variant="default"
      size="default"
      hapticFeedback
      onClick={handleClick}
    >
      Tap Me
    </TouchButton>
  );
}
```

### Pull to Refresh

```tsx
import { PullToRefresh } from "@/components/mobile";

function MessageList() {
  const handleRefresh = async () => {
    await fetchNewMessages();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} hapticFeedback>
      <MessageList messages={messages} />
    </PullToRefresh>
  );
}
```

### Long Press Menu

```tsx
import { LongPressMenu } from "@/components/mobile";

function MessageItem({ message }) {
  const menuItems = [
    {
      id: "reply",
      label: "Reply",
      icon: <Reply />,
      onClick: () => handleReply(message),
    },
    {
      id: "delete",
      label: "Delete",
      destructive: true,
      onClick: () => handleDelete(message),
    },
  ];

  return (
    <LongPressMenu items={menuItems}>
      <div className="message">{message.content}</div>
    </LongPressMenu>
  );
}
```

### Swipe Actions

```tsx
import { MessageSwipeActions } from "@/components/mobile";

function Message({ message, isOwn }) {
  return (
    <MessageSwipeActions
      isOwn={isOwn}
      onReply={() => handleReply(message)}
      onReact={() => handleReact(message)}
      onDelete={isOwn ? () => handleDelete(message) : undefined}
    >
      <MessageContent message={message} />
    </MessageSwipeActions>
  );
}
```

### Virtual Scrolling

```tsx
import { VirtualMessageList } from "@/components/mobile";

function ChatView({ messages }) {
  const renderMessage = (message, index) => (
    <MessageItem key={message.id} message={message} />
  );

  return (
    <VirtualMessageList
      messages={messages}
      renderMessage={renderMessage}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMoreMessages}
      estimatedMessageHeight={72}
    />
  );
}
```

### Bottom Sheet

```tsx
import { BottomSheet } from "@/components/mobile";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      snapPoints={[0.9, 0.5, 0.2]}
      showHandle
    >
      <div className="p-6">
        <h2>Bottom Sheet Content</h2>
      </div>
    </BottomSheet>
  );
}
```

### Date & Time Pickers

```tsx
import { MobileDatePicker, MobileTimePicker } from "@/components/mobile";

function ScheduleForm() {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  return (
    <div className="space-y-4">
      <MobileDatePicker
        value={date}
        onChange={setDate}
        minDate={new Date()}
        highlightToday
      />

      <MobileTimePicker
        value={time}
        onChange={setTime}
        format="12h"
        minuteStep={15}
      />
    </div>
  );
}
```

### Safe Area Handling

```tsx
import { SafeAreaView, FixedBottomBar } from "@/components/mobile";

function Layout({ children }) {
  return (
    <SafeAreaView edges={["top", "bottom"]}>
      {children}

      <FixedBottomBar>
        <NavigationBar />
      </FixedBottomBar>
    </SafeAreaView>
  );
}
```

### Keyboard Avoidance

```tsx
import { KeyboardAvoidingView } from "@/components/mobile";

function ChatInput() {
  return (
    <KeyboardAvoidingView behavior="padding">
      <div className="p-4">
        <input type="text" placeholder="Type a message..." />
        <button>Send</button>
      </div>
    </KeyboardAvoidingView>
  );
}
```

### Gesture Navigation

```tsx
import { GestureNavigation } from "@/components/mobile";
import { useRouter } from "next/navigation";

function PageWithGestures() {
  const router = useRouter();

  return (
    <GestureNavigation
      onSwipeRight={() => router.back()}
      onSwipeLeft={() => router.forward()}
      showIndicators
      hapticFeedback
    >
      <PageContent />
    </GestureNavigation>
  );
}
```

### Pinch to Zoom

```tsx
import { PinchZoom } from "@/components/mobile";

function ImageViewer({ imageUrl }) {
  return (
    <PinchZoom
      minScale={1}
      maxScale={4}
      enableRotation
      enableDownload
      downloadUrl={imageUrl}
    >
      <img src={imageUrl} alt="Zoomable" />
    </PinchZoom>
  );
}
```

---

## Component Reference

### TouchOptimized Components

All touch-optimized components meet iOS (44pt) and Android (48dp) minimum tap target requirements.

#### TouchButton

```tsx
<TouchButton
  variant="default" | "secondary" | "destructive" | "ghost" | "link"
  size="default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  rounded="default" | "full" | "none"
  hapticFeedback={boolean}
  onClick={handler}
/>
```

#### TouchListItem

```tsx
<TouchListItem
  onClick={handler}
  href="/path"
  disabled={boolean}
  hapticFeedback={boolean}
>
  <ItemContent />
</TouchListItem>
```

### Pull to Refresh

```tsx
<PullToRefresh
  onRefresh={async () => await fetchData()}
  threshold={80}
  maxPullDistance={120}
  disabled={false}
  hapticFeedback={true}
>
  <Content />
</PullToRefresh>
```

**Props:**

- `onRefresh` - Async function to call on refresh
- `threshold` - Distance in pixels to trigger refresh (default: 80)
- `maxPullDistance` - Maximum pull distance (default: 120)
- `hapticFeedback` - Enable haptic feedback (default: true)

### Long Press Menu

```tsx
<LongPressMenu
  items={menuItems}
  duration={500}
  hapticFeedback={true}
  onLongPressStart={() => console.log("Started")}
>
  <Content />
</LongPressMenu>
```

**MenuItem Interface:**

```tsx
interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}
```

### Virtual Message List

```tsx
<VirtualMessageList
  messages={messages}
  renderMessage={(msg, idx) => <MessageItem message={msg} />}
  isLoading={false}
  hasMore={true}
  onLoadMore={loadMore}
  estimatedMessageHeight={72}
  overscan={5}
/>
```

**Features:**

- Virtual scrolling with @tanstack/react-virtual
- Smooth 60fps performance
- Auto-scroll to bottom for new messages
- Infinite scroll support
- Pull-to-refresh integration

### Bottom Sheet

```tsx
<BottomSheet
  isOpen={isOpen}
  onClose={handleClose}
  snapPoints={[0.9, 0.5, 0.2]} // Percentages of screen height
  defaultSnapPoint={0}
  enableDrag={true}
  showHandle={true}
  closeOnBackdropClick={true}
>
  <SheetContent />
</BottomSheet>
```

**Snap Points:**

- `0.9` - Nearly full screen
- `0.5` - Half screen
- `0.2` - Peek mode

### Safe Area View

```tsx
<SafeAreaView
  edges={['top', 'bottom', 'left', 'right']}
  mode="padding" | "margin"
>
  <Content />
</SafeAreaView>
```

**Utility Classes:**

```tsx
import { safeAreaClasses } from '@/components/mobile'

<div className={safeAreaClasses.top}>Header</div>
<div className={safeAreaClasses.bottom}>Footer</div>
```

### Keyboard Avoiding View

```tsx
<KeyboardAvoidingView
  behavior="padding" | "height" | "position"
  keyboardVerticalOffset={0}
  enabled={true}
>
  <InputField />
</KeyboardAvoidingView>
```

**Hook:**

```tsx
const { isKeyboardVisible, keyboardHeight } = useKeyboard();
```

---

## Best Practices

### 1. Touch Targets

Always use minimum 44pt (iOS) or 48dp (Android) tap targets:

```tsx
// Good
<TouchButton size="default">Tap Me</TouchButton>

// Bad - too small
<button className="h-6 w-6">X</button>

// Fix small icons
<TouchArea>
  <SmallIcon />
</TouchArea>
```

### 2. Haptic Feedback

Use haptic feedback for important actions:

```tsx
<TouchButton
  hapticFeedback // Subtle feedback
  onClick={handleImportantAction}
>
  Confirm
</TouchButton>
```

### 3. Gestures

Provide visual feedback for gestures:

```tsx
<SwipeActions leftActions={[replyAction]} rightActions={[deleteAction]}>
  <Message />
</SwipeActions>
```

### 4. Safe Areas

Always handle safe areas for full-screen views:

```tsx
<SafeAreaView edges={["top", "bottom"]}>
  <FullScreenContent />
</SafeAreaView>
```

### 5. Performance

Use virtual scrolling for long lists:

```tsx
// Good - Virtual scrolling
<VirtualMessageList messages={10000messages} />

// Bad - Renders all items
{messages.map(msg => <Message key={msg.id} message={msg} />)}
```

### 6. Keyboard Handling

Prevent inputs from being hidden:

```tsx
<KeyboardAvoidingView behavior="padding">
  <MessageInput />
</KeyboardAvoidingView>
```

### 7. Loading States

Show skeleton loaders while loading:

```tsx
import { MessageSkeleton } from "@/components/mobile";

{
  isLoading ? (
    <MessageSkeleton count={5} />
  ) : (
    <MessageList messages={messages} />
  );
}
```

---

## Mobile-First Guidelines

### Responsive Breakpoints

```tsx
// Tailwind breakpoints
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops

// Use mobile-first approach
<div className="p-4 md:p-6 lg:p-8">
  Mobile: 16px, Tablet: 24px, Desktop: 32px padding
</div>
```

### Touch vs Click

```tsx
// Mobile - Touch events
onTouchStart, onTouchMove, onTouchEnd

// Desktop - Mouse events
onClick, onMouseEnter, onMouseLeave

// Both - Use TouchButton for compatibility
<TouchButton onClick={handler}>
  Works on mobile and desktop
</TouchButton>
```

### Platform Detection

```tsx
import { isMobile, isIOS, isAndroid } from "@/lib/platform-detect";

if (isMobile) {
  // Show mobile UI
}

if (isIOS) {
  // iOS-specific features
}
```

---

## Performance Tips

1. **Lazy Load Images**: Use lazy loading for message attachments
2. **Virtual Scrolling**: Always use VirtualMessageList for message lists
3. **Debounce Input**: Debounce search and typing indicators
4. **Memoization**: Use React.memo for list items
5. **Code Splitting**: Lazy load bottom sheets and modals

---

## Accessibility

All components support:

- **Screen Readers**: ARIA labels and roles
- **Keyboard Navigation**: Tab order and shortcuts
- **High Contrast**: Respects system preferences
- **Reduced Motion**: Respects prefers-reduced-motion

```tsx
<TouchButton aria-label="Send message" role="button" tabIndex={0}>
  <SendIcon />
</TouchButton>
```

---

## Testing

### Unit Tests

```tsx
import { render, fireEvent } from "@testing-library/react";
import { TouchButton } from "@/components/mobile";

test("TouchButton triggers haptic feedback", () => {
  const mockVibrate = jest.fn();
  navigator.vibrate = mockVibrate;

  const { getByText } = render(<TouchButton hapticFeedback>Click</TouchButton>);

  fireEvent.click(getByText("Click"));
  expect(mockVibrate).toHaveBeenCalledWith(10);
});
```

### E2E Tests

```tsx
// Playwright mobile test
test("swipe to delete message", async ({ page }) => {
  await page.goto("/chat");

  const message = page.locator('[data-testid="message-1"]');

  // Simulate swipe left
  await message.swipe({ x: -100, y: 0 });

  // Verify delete action appears
  await expect(page.locator('[data-testid="delete-action"]')).toBeVisible();
});
```

---

## Support

For issues or questions:

- GitHub Issues: [nself-chat/issues](https://github.com/nself/nself-chat/issues)
- Documentation: See `/docs` directory
- Examples: See `/e2e/mobile` for test examples

---

## Version History

- **v0.9.0** - Added BottomSheet, Date/Time Pickers, Safe Areas, Keyboard Avoidance, Gesture Navigation
- **v0.8.0** - Added Pull-to-Refresh, Long Press Menu, Pinch Zoom, Virtual Scrolling, Touch-Optimized Components
- **v0.7.0** - Initial mobile components (Navigation, Header, Sidebar, Drawer, Swipe Actions)

---

## License

MIT License - Part of the nself-chat project
