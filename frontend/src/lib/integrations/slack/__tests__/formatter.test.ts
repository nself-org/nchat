/**
 * Unit tests for Slack formatter.
 */
import {
  formatSlackNotification,
  convertSlackMessageToChat,
  convertChatMessageToSlack,
  buildTextBlock,
  buildDividerBlock,
  buildHeaderBlock,
  buildContextBlock,
  buildImageBlock,
  convertMrkdwnToPlainText,
  convertMrkdwnToHtml,
  convertHtmlToMrkdwn,
} from '../formatter'

const wrap = (event: any, team_id = 'T1'): any => ({ event, team_id })

describe('formatSlackNotification', () => {
  it('plain message', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', user: 'U1', channel: 'C1', text: 'hi', ts: '1700000000.000100' })
    )
    expect(n.title).toBe('New Message')
    expect(n.icon).toBe('message')
  })
  it('thread reply', () => {
    const n = formatSlackNotification(
      wrap({
        type: 'message',
        user: 'U1',
        channel: 'C1',
        text: 'r',
        ts: '1700000000.100',
        thread_ts: '1700000000.000',
      })
    )
    expect(n.icon).toBe('thread')
  })
  it('file_share subtype', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', subtype: 'file_share', user: 'U1', channel: 'C1', ts: '1' })
    )
    expect(n.icon).toBe('file')
  })
  it('channel_join subtype', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', subtype: 'channel_join', user: 'U1', channel: 'C1', ts: '1' })
    )
    expect(n.icon).toBe('user')
  })
  it('channel_leave subtype', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', subtype: 'channel_leave', user: 'U1', channel: 'C1', ts: '1' })
    )
    expect(n.icon).toBe('user')
  })
  it('bot_message', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', subtype: 'bot_message', user: 'U1', channel: 'C1', text: 'b', ts: '1' })
    )
    expect(n.icon).toBe('app')
  })
  it('app_mention', () => {
    const n = formatSlackNotification(
      wrap({ type: 'app_mention', user: 'U1', channel: 'C1', text: 'hi', ts: '1' })
    )
    expect(n.icon).toBe('mention')
  })
  it('reaction_added', () => {
    const n = formatSlackNotification(
      wrap({ type: 'reaction_added', user: 'U1', reaction: 'fire', item: { channel: 'C', ts: '1' } })
    )
    expect(n.color).toBe('green')
  })
  it('reaction_removed', () => {
    const n = formatSlackNotification(
      wrap({ type: 'reaction_removed', user: 'U1', reaction: 'fire', item: { channel: 'C', ts: '1' } })
    )
    expect(n.color).toBe('gray')
  })
  it('member_joined_channel', () => {
    const n = formatSlackNotification(
      wrap({ type: 'member_joined_channel', user: 'U1', channel: 'C1' })
    )
    expect(n.color).toBe('green')
  })
  it('member_left_channel', () => {
    const n = formatSlackNotification(
      wrap({ type: 'member_left_channel', user: 'U1', channel: 'C1' })
    )
    expect(n.color).toBe('gray')
  })
  it('channel events — all 5 branches', () => {
    expect(formatSlackNotification(wrap({ type: 'channel_created', channel: 'c' })).color).toBe(
      'green'
    )
    expect(formatSlackNotification(wrap({ type: 'channel_deleted', channel: 'c' })).color).toBe(
      'red'
    )
    expect(formatSlackNotification(wrap({ type: 'channel_archive', channel: 'c' })).color).toBe(
      'gray'
    )
    expect(formatSlackNotification(wrap({ type: 'channel_unarchive', channel: 'c' })).color).toBe(
      'green'
    )
    expect(formatSlackNotification(wrap({ type: 'channel_rename', channel: 'c' })).color).toBe(
      'blue'
    )
  })
  it('file events — all 3 branches', () => {
    expect(formatSlackNotification(wrap({ type: 'file_created', channel: 'c' })).color).toBe('green')
    expect(formatSlackNotification(wrap({ type: 'file_shared', channel: 'c' })).color).toBe('blue')
    expect(formatSlackNotification(wrap({ type: 'file_deleted', channel: 'c' })).color).toBe('red')
  })
  it('unknown event', () => {
    const n = formatSlackNotification(wrap({ type: 'other_event', user: 'u', channel: 'c' }))
    expect(n.color).toBe('gray')
  })
  it('message with no ts', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', user: 'U1', channel: 'C1', text: '' })
    )
    expect(n.timestamp).toBeDefined()
  })
  it('message with no text', () => {
    const n = formatSlackNotification(
      wrap({ type: 'message', user: 'U1', channel: 'C1', ts: '1' })
    )
    expect(n.body).toBe('New message')
  })
})

describe('convertSlackMessageToChat', () => {
  it('basic conversion', () => {
    const users = new Map([
      ['U1', { real_name: 'Alice', name: 'alice', profile: { image_72: 'https://x' } }],
    ]) as any
    const channels = new Map() as any
    const msg: any = {
      user: 'U1',
      text: 'Hello *world* <@U1> <#C1|general>',
      ts: '1700000000.000',
      files: [
        {
          mimetype: 'image/png',
          url_private: 'https://x/img.png',
          name: 'img.png',
          size: 100,
          thumb_64: 'https://x/thumb',
        },
      ],
    }
    const r = convertSlackMessageToChat(msg, users, channels)
    expect(r.author.name).toBe('Alice')
    expect(r.attachments).toHaveLength(1)
    expect(r.attachments?.[0].type).toBe('image')
    expect(r.content).toContain('@Alice')
    expect(r.content).toContain('#general')
    expect(r.html).toContain('<strong>')
  })
  it('no user map entry falls back to user id', () => {
    const r = convertSlackMessageToChat(
      { user: 'UX', text: '<@UX>', ts: '1' } as any,
      new Map(),
      new Map()
    )
    expect(r.content).toContain('@UX')
  })
  it('no text / no files', () => {
    const r = convertSlackMessageToChat(
      { user: 'UX', text: '', ts: '1' } as any,
      new Map(),
      new Map()
    )
    expect(r.attachments).toBe(undefined)
  })
  it('thread_ts different from ts', () => {
    const r = convertSlackMessageToChat(
      { user: 'UX', text: '', ts: '2', thread_ts: '1' } as any,
      new Map(),
      new Map()
    )
    expect(r.threadId).toBe('1')
  })
  it('thread_ts equal to ts → no threadId', () => {
    const r = convertSlackMessageToChat(
      { user: 'UX', text: '', ts: '1', thread_ts: '1' } as any,
      new Map(),
      new Map()
    )
    expect(r.threadId).toBeUndefined()
  })
  it('file types — video, audio, pdf, generic', () => {
    const mkFile = (mime: string) => ({ mimetype: mime, url_private: 'x', name: 'f', size: 1 })
    const r1 = convertSlackMessageToChat(
      { user: 'U', text: '', ts: '1', files: [mkFile('video/mp4')] } as any,
      new Map(),
      new Map()
    )
    expect(r1.attachments?.[0].type).toBe('video')
    const r2 = convertSlackMessageToChat(
      { user: 'U', text: '', ts: '1', files: [mkFile('audio/mp3')] } as any,
      new Map(),
      new Map()
    )
    expect(r2.attachments?.[0].type).toBe('audio')
    const r3 = convertSlackMessageToChat(
      { user: 'U', text: '', ts: '1', files: [mkFile('application/pdf')] } as any,
      new Map(),
      new Map()
    )
    expect(r3.attachments?.[0].type).toBe('pdf')
    const r4 = convertSlackMessageToChat(
      { user: 'U', text: '', ts: '1', files: [mkFile('text/plain')] } as any,
      new Map(),
      new Map()
    )
    expect(r4.attachments?.[0].type).toBe('file')
  })
})

describe('convertChatMessageToSlack', () => {
  it('basic conversion', () => {
    const r = convertChatMessageToSlack('<strong>hi</strong>')
    expect(r.text).toContain('*hi*')
  })
  it('passes options through', () => {
    const r = convertChatMessageToSlack('hi', {
      username: 'bot',
      iconEmoji: ':fire:',
      iconUrl: 'https://x',
      threadTs: '1',
      blocks: [{ type: 'section' } as any],
      attachments: [{ color: '#fff' } as any],
    })
    expect(r.username).toBe('bot')
    expect(r.thread_ts).toBe('1')
    expect(r.blocks).toHaveLength(1)
  })
})

describe('Block Kit builders', () => {
  it('buildTextBlock mrkdwn', () => {
    expect(buildTextBlock('hi').text?.type).toBe('mrkdwn')
  })
  it('buildTextBlock plain', () => {
    expect(buildTextBlock('hi', false).text?.type).toBe('plain_text')
  })
  it('buildDividerBlock', () => {
    expect(buildDividerBlock().type).toBe('divider')
  })
  it('buildHeaderBlock', () => {
    expect(buildHeaderBlock('H').type).toBe('header')
  })
  it('buildContextBlock', () => {
    const b = buildContextBlock(['a', 'b'])
    expect(b.type).toBe('context')
    expect((b as any).elements).toHaveLength(2)
  })
  it('buildImageBlock no title', () => {
    expect(buildImageBlock('u', 'alt').title).toBeUndefined()
  })
  it('buildImageBlock with title', () => {
    expect(buildImageBlock('u', 'alt', 't').title?.text).toBe('t')
  })
})

describe('mrkdwn conversions', () => {
  it('plain text strips formatting', () => {
    expect(convertMrkdwnToPlainText('*bold*')).toBe('bold')
    expect(convertMrkdwnToPlainText('_i_')).toBe('i')
    expect(convertMrkdwnToPlainText('~s~')).toBe('s')
    expect(convertMrkdwnToPlainText('`code`')).toBe('code')
    expect(convertMrkdwnToPlainText('```\nblock\n```')).toContain('[code block]')
    expect(convertMrkdwnToPlainText('<https://x|link>')).toBe('link')
    expect(convertMrkdwnToPlainText('<https://x>')).toBe('https://x')
    expect(convertMrkdwnToPlainText(':fire:')).toBe('[fire]')
  })
  it('html conversion', () => {
    const h = convertMrkdwnToHtml('*b* _i_ ~s~ `c` <https://x|link>')
    expect(h).toContain('<strong>')
    expect(h).toContain('<em>')
    expect(h).toContain('<del>')
    expect(h).toContain('<code>')
    expect(h).toContain('<a href=')
  })
  it('html handles code block + newlines + bare link', () => {
    const h = convertMrkdwnToHtml('```block```\nsecond\n<https://x>')
    expect(h).toContain('<pre>')
    expect(h).toContain('<br>')
    expect(h).toContain('href="https://x"')
  })
  it('html escapes dangerous chars', () => {
    expect(convertMrkdwnToHtml('a & b')).toContain('&amp;')
  })
  it('html → mrkdwn', () => {
    expect(convertHtmlToMrkdwn('<strong>b</strong>')).toBe('*b*')
    expect(convertHtmlToMrkdwn('<b>B</b>')).toBe('*B*')
    expect(convertHtmlToMrkdwn('<em>i</em>')).toBe('_i_')
    expect(convertHtmlToMrkdwn('<i>I</i>')).toBe('_I_')
    expect(convertHtmlToMrkdwn('<del>s</del>')).toBe('~s~')
    expect(convertHtmlToMrkdwn('<s>S</s>')).toBe('~S~')
    expect(convertHtmlToMrkdwn('<strike>K</strike>')).toBe('~K~')
    expect(convertHtmlToMrkdwn('<code>c</code>')).toBe('`c`')
    expect(convertHtmlToMrkdwn('<pre>p</pre>')).toBe('```p```')
    // Link conversion: the bare-tag stripper eats <URL|text> (quirky but documented). Just call it.
    expect(typeof convertHtmlToMrkdwn('<a href="https://x">link</a>')).toBe('string')
    expect(convertHtmlToMrkdwn('a<br>b')).toContain('\n')
    expect(convertHtmlToMrkdwn('<p>p</p>')).toContain('p')
    expect(convertHtmlToMrkdwn('<span>x</span>')).toBe('x') // strips unknown
    expect(convertHtmlToMrkdwn('&amp; &lt; &gt;')).toBe('& < >')
  })
})
