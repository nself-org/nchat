# Accessibility Quick Reference

**nself-chat (nchat)** - Quick Access Guide to Accessibility Features

---

## Quick Access Menu

**Universal Access Icon** in the top navigation bar provides instant access to:

- 🌓 Theme toggle (Light/Dark)
- 🔍 Font size (Small/Medium/Large)
- 👁️ High contrast mode
- 🎬 Reduce motion
- 🔊 Screen reader mode
- ⌨️ Keyboard shortcuts reference

**Keyboard Shortcut**: `Cmd/Ctrl + Shift + A`

---

## Essential Keyboard Shortcuts

### Global

| Shortcut       | Action          |
| -------------- | --------------- |
| `Cmd/Ctrl + K` | Command palette |
| `Cmd/Ctrl + F` | Search messages |
| `Cmd/Ctrl + ,` | Settings        |
| `Cmd/Ctrl + \` | Toggle sidebar  |
| `Escape`       | Close/Cancel    |

### Navigation

| Shortcut      | Action           |
| ------------- | ---------------- |
| `Alt + ↓`     | Next channel     |
| `Alt + ↑`     | Previous channel |
| `Tab`         | Next element     |
| `Shift + Tab` | Previous element |

### Messaging

| Shortcut           | Action            |
| ------------------ | ----------------- |
| `Cmd/Ctrl + Enter` | Send message      |
| `↑` (empty input)  | Edit last message |
| `R`                | Reply             |
| `T`                | Thread            |
| `E`                | React             |

**View all shortcuts**: Press `Cmd/Ctrl + /`

---

## Accessibility Settings

**Location**: Settings → Accessibility

### Visual

- High contrast mode (Normal/High/Higher)
- Font size (Small/Medium/Large)
- Dyslexia-friendly font
- Reduce transparency

### Motion

- Reduce motion
- Disable animations
- Autoplay controls

### Keyboard

- Always show focus indicators
- Larger touch targets
- Keyboard shortcuts on/off
- Show keyboard hints

### Screen Reader

- Screen reader optimization
- Announce new messages
- Prefer captions
- Verbose mode

---

## Skip Links

Press `Tab` immediately after page load to access:

1. **Skip to main content** - Jump to messages
2. **Skip to sidebar** - Jump to channels
3. **Skip to message input** - Jump to composer

---

## Screen Reader Tips

### Recommended Settings

1. **Enable**: Settings → Accessibility → Screen Reader Optimization
2. **Enable**: Announce Messages (for new message notifications)
3. **Enable**: Prefer Captions (for media content)

### NVDA/JAWS (Windows)

- `H` - Navigate by headings
- `F` - Navigate by forms
- `R` - Navigate by regions/landmarks
- `Insert + F7` - List all links
- `Insert + F6` - List all headings

### VoiceOver (Mac)

- `VO + U` - Open rotor
- `VO + Right/Left` - Navigate items
- `VO + Space` - Activate
- `VO + Command + H` - Next heading

### VoiceOver (iOS)

- Swipe right/left - Navigate
- Double-tap - Activate
- Two-finger rotate - Open rotor
- Three-finger swipe - Scroll

### TalkBack (Android)

- Swipe right/left - Navigate
- Double-tap - Activate
- Swipe down then right - Reading menu
- Swipe up then right - Actions

---

## High Contrast Mode

Three levels available:

- **Normal** - Standard contrast (7:1 text ratio)
- **High** - Enhanced contrast (10:1 text ratio)
- **Higher** - Maximum contrast (15:1 text ratio)

**Quick Toggle**: Accessibility Menu → High Contrast

---

## Font Size

Three preset sizes:

- **Small** (14px) - Compact view
- **Medium** (16px) - Default, optimal readability
- **Large** (18px) - Enhanced readability

**Quick Adjust**: Accessibility Menu → Font Size Controls

---

## Reduce Motion

When enabled:

- ✅ Instant transitions (no animation delays)
- ✅ Fade-only animations (no sliding/scaling)
- ✅ Static UI elements
- ✅ Respects system preferences

**Quick Toggle**: Accessibility Menu → Reduce Motion

---

## Focus Indicators

All interactive elements have visible focus indicators:

- **Default**: 2px ring with offset
- **High Contrast**: 3px ring, increased offset
- **Always Show**: Enable in Settings → Accessibility → Keyboard

Press `Tab` to see focus move through the page.

---

## Color Coding

Important: Color is never used as the only indicator!

- 🔴 Error messages include text + icon
- 🟢 Success states include text + icon
- 🔵 Information includes text + icon
- 🟡 Warnings include text + icon

All meet AAA contrast standards.

---

## Touch Targets

All interactive elements meet AAA standards:

- **Minimum**: 44×44 pixels
- **Recommended**: 48×48 pixels
- **With spacing**: Easy to tap without errors

**Larger Targets**: Settings → Accessibility → Larger Touch Targets

---

## Media Accessibility

### Images

- ✅ All images have descriptive alt text
- ✅ Decorative images hidden from screen readers

### Videos

- ✅ Captions available
- ✅ Transcripts provided
- ✅ Auto-play disabled by default

### Audio

- ✅ Transcripts for voice messages
- ✅ Visual indicators for playback

---

## Forms

All forms include:

- ✅ Labels for all inputs
- ✅ Hint text for guidance
- ✅ Error messages with suggestions
- ✅ Required field indicators
- ✅ Validation feedback

---

## Dynamic Content

Screen reader announcements for:

- 📨 New messages (polite)
- 🔔 Mentions (assertive)
- ⚠️ Errors (assertive)
- ℹ️ Status updates (polite)
- ✅ Success confirmations (polite)

**Control**: Settings → Accessibility → Announce Messages

---

## Getting Help

### Documentation

- 📖 [Full Accessibility Guide](accessibility.md)
- 📊 [Color Contrast Report](color-contrast-report.md)
- 🔊 [Screen Reader Testing](screen-reader-testing-report.md)

### Support

- 📧 Email: accessibility@nself.org
- 🐛 GitHub: [Report Issue](https://github.com/nself-chat/issues/new?labels=accessibility)
- 💬 Support: Settings → Help → Contact Support

---

## Quick Wins Checklist

New to accessibility features? Start here:

- [ ] Open Accessibility Menu (`Cmd/Ctrl + Shift + A`)
- [ ] Try keyboard navigation (Tab through the page)
- [ ] Increase font size if text is small
- [ ] Enable high contrast if colors are hard to see
- [ ] Turn on reduce motion if animations are distracting
- [ ] Review keyboard shortcuts (`Cmd/Ctrl + /`)
- [ ] Explore screen reader mode if using assistive tech

---

## Tips for Different Needs

### Low Vision

1. Increase font size (Large)
2. Enable high contrast mode
3. Reduce transparency
4. Use zoom (browser or OS)

### Color Blindness

1. Enable high contrast
2. Rely on text labels (not just colors)
3. Icons accompany all color-coded items

### Motor Impairments

1. Use keyboard navigation
2. Enable larger touch targets
3. Adjust OS pointer speed
4. Learn keyboard shortcuts

### Cognitive

1. Disable animations
2. Reduce motion
3. Use compact mode for less distraction
4. Enable auto-save for forms

### Hearing Impairments

1. Enable captions
2. Visual notifications on
3. Flash screen for alerts (OS setting)

### Screen Reader Users

1. Enable screen reader optimization
2. Turn on message announcements
3. Use skip links
4. Learn keyboard shortcuts

---

**Last Updated**: January 31, 2026
**Version**: 1.0.0
