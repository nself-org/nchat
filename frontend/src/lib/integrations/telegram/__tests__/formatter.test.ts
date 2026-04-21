/**
 * Unit tests for Telegram formatter (focus on notification routing).
 */
import {
  formatTelegramNotification,
  buildInlineKeyboard,
  buildUrlButton,
  buildCallbackButton,
  buildWebAppButton,
  TELEGRAM_COLORS,
} from '../formatter'

const baseChat = (type = 'group', title = 'Group'): any => ({
  id: 100,
  type,
  title: type === 'group' ? title : undefined,
  first_name: type === 'private' ? 'Alice' : undefined,
})
const baseFrom = { id: 1, first_name: 'Alice', username: 'alice' }

const mkMsg = (over: any = {}): any => ({
  message_id: 10,
  date: 1700000000,
  chat: baseChat(),
  from: baseFrom,
  ...over,
})

describe('formatTelegramNotification — message branches', () => {
  it('plain text', () => {
    const n = formatTelegramNotification({ message: mkMsg({ text: 'hi' }) } as any)
    expect(n.icon).toBe('message')
    expect(n.title).toContain('New Message')
  })
  it('edited_message', () => {
    const n = formatTelegramNotification({ edited_message: mkMsg({ text: 'edit' }) } as any)
    expect(n.title).toContain('Edited')
  })
  it('channel_post routes through', () => {
    const n = formatTelegramNotification({
      channel_post: mkMsg({ text: 'x', chat: baseChat('channel', 'News') }),
    } as any)
    expect(n.metadata.updateType).toBe('channel_post')
  })
  it('edited_channel_post', () => {
    const n = formatTelegramNotification({
      edited_channel_post: mkMsg({ text: 'x', chat: baseChat('channel', 'News') }),
    } as any)
    expect(n.metadata.updateType).toBe('edited_channel_post')
  })
  it('photo', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ photo: [{ file_id: 'p1' }], caption: 'hi' }),
    } as any)
    expect(n.icon).toBe('photo')
  })
  it('photo without caption', () => {
    const n = formatTelegramNotification({ message: mkMsg({ photo: [{ file_id: 'p1' }] }) } as any)
    expect(n.body).toBe('Photo received')
  })
  it('video + caption', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ video: { file_id: 'v' }, caption: 'cap' }),
    } as any)
    expect(n.icon).toBe('video')
  })
  it('voice', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ voice: { file_id: 'a', duration: 65 } }),
    } as any)
    expect(n.icon).toBe('voice')
    expect(n.body).toContain('1:05')
  })
  it('document', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ document: { file_id: 'd', file_name: 'f.pdf' } }),
    } as any)
    expect(n.icon).toBe('document')
    expect(n.body).toBe('f.pdf')
  })
  it('document no filename', () => {
    expect(
      formatTelegramNotification({ message: mkMsg({ document: { file_id: 'd' } }) } as any).body
    ).toBe('File received')
  })
  it('sticker with emoji', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ sticker: { emoji: '🔥' } }),
    } as any)
    expect(n.icon).toBe('sticker')
    expect(n.body).toBe('🔥')
  })
  it('sticker no emoji', () => {
    expect(
      formatTelegramNotification({ message: mkMsg({ sticker: {} }) } as any).body
    ).toBe('Sticker received')
  })
  it('poll', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ poll: { question: 'Why?' } }),
    } as any)
    expect(n.icon).toBe('poll')
  })
  it('location', () => {
    expect(
      formatTelegramNotification({ message: mkMsg({ location: {} }) } as any).icon
    ).toBe('location')
  })
  it('contact', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ contact: { first_name: 'Bob' } }),
    } as any)
    expect(n.icon).toBe('contact')
    expect(n.body).toBe('Bob')
  })
  it('new chat members', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ new_chat_members: [{ first_name: 'Alice' }, { first_name: 'Bob' }] }),
    } as any)
    expect(n.color).toBe('green')
    expect(n.body).toContain('Alice')
  })
  it('left chat member', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ left_chat_member: { first_name: 'Alice' } }),
    } as any)
    expect(n.color).toBe('red')
  })
  it('no recognized message type', () => {
    expect(formatTelegramNotification({ message: mkMsg({}) } as any).title).toBe(
      'Message in Group'
    )
  })
  it('private chat no type suffix', () => {
    const n = formatTelegramNotification({
      message: mkMsg({ text: 'hi', chat: baseChat('private') }),
    } as any)
    expect(n.title).toBe('New Message')
  })
})

describe('formatTelegramNotification — other updates', () => {
  it('callback_query', () => {
    const n = formatTelegramNotification({
      callback_query: {
        from: { id: 1, first_name: 'A' },
        data: 'press:ok',
        message: { message_id: 10, chat: baseChat() },
      },
    } as any)
    expect(n.icon).toBe('callback')
  })
  it('callback_query no data', () => {
    const n = formatTelegramNotification({
      callback_query: { from: { id: 1, first_name: 'A' } },
    } as any)
    expect(n.body).toBe('Button interaction')
  })
  it('my_chat_member join', () => {
    const n = formatTelegramNotification({
      my_chat_member: {
        old_chat_member: { status: 'left', user: { id: 1, first_name: 'A' } },
        new_chat_member: { status: 'member', user: { id: 1, first_name: 'A' } },
        chat: baseChat(),
        date: 1700000000,
      },
    } as any)
    expect(n.color).toBe('green')
  })
  it('chat_member leave', () => {
    const n = formatTelegramNotification({
      chat_member: {
        old_chat_member: { status: 'member', user: { id: 1, first_name: 'A' } },
        new_chat_member: { status: 'left', user: { id: 1, first_name: 'A' } },
        chat: baseChat(),
        date: 1700000000,
      },
    } as any)
    expect(n.color).toBe('red')
  })
  it('chat_member updated (neither join nor leave)', () => {
    const n = formatTelegramNotification({
      chat_member: {
        old_chat_member: { status: 'member', user: { id: 1, first_name: 'A' } },
        new_chat_member: { status: 'administrator', user: { id: 1, first_name: 'A' } },
        chat: baseChat(),
        date: 1700000000,
      },
    } as any)
    expect(n.icon).toBe('telegram')
  })
  it('chat_join_request', () => {
    const n = formatTelegramNotification({
      chat_join_request: {
        from: { id: 1, first_name: 'Alice' },
        chat: baseChat(),
        date: 1700000000,
      },
    } as any)
    expect(n.color).toBe('yellow')
  })
  it('poll update (open)', () => {
    const n = formatTelegramNotification({
      poll: { question: 'Why?', is_closed: false },
    } as any)
    expect(n.color).toBe('blue')
  })
  it('poll update (closed)', () => {
    const n = formatTelegramNotification({
      poll: { question: 'Why?', is_closed: true },
    } as any)
    expect(n.color).toBe('gray')
  })
  it('unknown update', () => {
    const n = formatTelegramNotification({} as any)
    expect(n.icon).toBe('telegram')
    expect(n.color).toBe('gray')
  })
})

describe('inline keyboard builders + TELEGRAM_COLORS', () => {
  it('buildInlineKeyboard', () => {
    const k = buildInlineKeyboard([[buildUrlButton('open', 'https://x')]])
    expect(k.inline_keyboard).toHaveLength(1)
  })
  it('buildUrlButton', () => {
    expect(buildUrlButton('t', 'https://x').url).toBe('https://x')
  })
  it('buildCallbackButton', () => {
    expect(buildCallbackButton('t', 'data').callback_data).toBe('data')
  })
  it('buildWebAppButton', () => {
    expect(buildWebAppButton('t', 'https://x').web_app?.url).toBe('https://x')
  })
  it('TELEGRAM_COLORS exported', () => {
    expect(Object.keys(TELEGRAM_COLORS).length).toBeGreaterThan(0)
  })
})
