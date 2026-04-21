/**
 * Unit tests for the slash command parser.
 */
import {
  parseCommand,
  isCommand,
  extractTrigger,
  extractArgs,
  argsToObject,
} from '../command-parser'

// Minimal SlashCommand mock helpers
function cmd(overrides: Partial<any> = {}): any {
  return {
    id: 'test',
    trigger: 'test',
    label: 'Test',
    description: '',
    arguments: [],
    ...overrides,
  }
}

function arg(overrides: Partial<any> = {}): any {
  return {
    id: 'a',
    name: 'a',
    type: 'string',
    required: false,
    ...overrides,
  }
}

describe('isCommand / extractTrigger / extractArgs', () => {
  it('isCommand detects slash prefix', () => {
    expect(isCommand('/help')).toBe(true)
    expect(isCommand('  /help')).toBe(true)
    expect(isCommand('hello')).toBe(false)
  })

  it('extractTrigger returns lowercase trigger', () => {
    expect(extractTrigger('/Help Me')).toBe('help')
    expect(extractTrigger('not a command')).toBeNull()
  })

  it('extractArgs returns everything after trigger', () => {
    expect(extractArgs('/help me out')).toBe('me out')
    expect(extractArgs('/help')).toBe('')
  })
})

describe('parseCommand - basic structure', () => {
  it('returns invalid on non-slash input', () => {
    const r = parseCommand('hello world', cmd())
    expect(r.isValid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it('parses simple command with no args', () => {
    const r = parseCommand('/test', cmd())
    expect(r.isValid).toBe(true)
    expect(r.args).toEqual([])
  })
})

describe('parseCommand - positional args', () => {
  it('parses required positional', () => {
    const r = parseCommand(
      '/test hello',
      cmd({
        arguments: [arg({ id: 'msg', position: 0, required: true })],
      })
    )
    expect(r.isValid).toBe(true)
    expect(r.args[0].value).toBe('hello')
  })

  it('reports missing required', () => {
    const r = parseCommand(
      '/test',
      cmd({
        arguments: [arg({ id: 'msg', position: 0, required: true })],
      })
    )
    expect(r.isValid).toBe(false)
    expect(r.errors[0].type).toBe('missing_required')
  })

  it('applies defaultValue for missing optional', () => {
    const r = parseCommand(
      '/test',
      cmd({
        arguments: [arg({ id: 'msg', position: 0, defaultValue: 'fallback' })],
      })
    )
    expect(r.isValid).toBe(true)
    expect(r.args[0].value).toBe('fallback')
  })

  it('handles rest type', () => {
    const r = parseCommand(
      '/test a b c',
      cmd({
        arguments: [arg({ id: 'rest', type: 'rest', position: 0 })],
      })
    )
    expect(r.args[0].value).toBe('a b c')
  })
})

describe('parseCommand - numeric types', () => {
  it('parses numbers', () => {
    const r = parseCommand(
      '/test 42',
      cmd({ arguments: [arg({ id: 'n', type: 'number', position: 0 })] })
    )
    expect(r.args[0].value).toBe(42)
    expect(r.isValid).toBe(true)
  })

  it('rejects non-numbers', () => {
    const r = parseCommand(
      '/test abc',
      cmd({ arguments: [arg({ id: 'n', type: 'number', required: true, position: 0 })] })
    )
    expect(r.isValid).toBe(false)
  })

  it('enforces min/max', () => {
    const r = parseCommand(
      '/test 5',
      cmd({
        arguments: [
          arg({
            id: 'n',
            type: 'number',
            required: true,
            position: 0,
            validation: { min: 10 },
          }),
        ],
      })
    )
    expect(r.isValid).toBe(false)
  })
})

describe('parseCommand - booleans', () => {
  it('parses true forms', () => {
    for (const v of ['true', 'yes', '1', 'on']) {
      const r = parseCommand(
        `/test ${v}`,
        cmd({ arguments: [arg({ id: 'b', type: 'boolean', position: 0 })] })
      )
      expect(r.args[0].value).toBe(true)
    }
  })

  it('parses false forms', () => {
    for (const v of ['false', 'no', '0', 'off']) {
      const r = parseCommand(
        `/test ${v}`,
        cmd({ arguments: [arg({ id: 'b', type: 'boolean', position: 0 })] })
      )
      expect(r.args[0].value).toBe(false)
    }
  })

  it('rejects invalid boolean', () => {
    const r = parseCommand(
      '/test maybe',
      cmd({ arguments: [arg({ id: 'b', type: 'boolean', required: true, position: 0 })] })
    )
    expect(r.isValid).toBe(false)
  })
})

describe('parseCommand - user/channel types', () => {
  it('parses @mention', () => {
    const r = parseCommand(
      '/test @alice',
      cmd({ arguments: [arg({ id: 'u', type: 'user', position: 0 })] })
    )
    expect(r.args[0].value).toBe('alice')
  })

  it('parses #channel', () => {
    const r = parseCommand(
      '/test #general',
      cmd({ arguments: [arg({ id: 'c', type: 'channel', position: 0 })] })
    )
    expect(r.args[0].value).toBe('general')
  })
})

describe('parseCommand - choices', () => {
  it('validates allowed choice', () => {
    const r = parseCommand(
      '/test blue',
      cmd({
        arguments: [
          arg({
            id: 'color',
            type: 'choice',
            required: true,
            position: 0,
            choices: [{ value: 'blue' }, { value: 'red' }],
          }),
        ],
      })
    )
    expect(r.isValid).toBe(true)
  })

  it('rejects invalid choice', () => {
    const r = parseCommand(
      '/test purple',
      cmd({
        arguments: [
          arg({
            id: 'color',
            type: 'choice',
            required: true,
            position: 0,
            choices: [{ value: 'blue' }],
          }),
        ],
      })
    )
    expect(r.isValid).toBe(false)
  })
})

describe('parseCommand - duration / date / time', () => {
  it('parses duration like 1h', () => {
    const r = parseCommand(
      '/test 1h',
      cmd({ arguments: [arg({ id: 'd', type: 'duration', position: 0 })] })
    )
    expect(r.args[0].value).toBe(60 * 60 * 1000)
  })

  it('parses combined 1h30m', () => {
    const r = parseCommand(
      '/test 1h30m',
      cmd({ arguments: [arg({ id: 'd', type: 'duration', position: 0 })] })
    )
    expect(r.args[0].value).toBe(60 * 60 * 1000 + 30 * 60 * 1000)
  })

  it('parses date "today"', () => {
    const r = parseCommand(
      '/test today',
      cmd({ arguments: [arg({ id: 'd', type: 'date', position: 0 })] })
    )
    expect(typeof r.args[0].value).toBe('string')
  })

  it('parses time HH:MM', () => {
    const r = parseCommand(
      '/test 14:30',
      cmd({ arguments: [arg({ id: 't', type: 'time', position: 0 })] })
    )
    expect(r.args[0].value).toBe('14:30:00')
  })

  it('parses time with am/pm', () => {
    const r = parseCommand(
      '/test 2:30pm',
      cmd({ arguments: [arg({ id: 't', type: 'time', position: 0 })] })
    )
    expect(r.args[0].value).toBe('14:30:00')
  })

  it('rejects invalid duration', () => {
    const r = parseCommand(
      '/test hello',
      cmd({ arguments: [arg({ id: 'd', type: 'duration', required: true, position: 0 })] })
    )
    expect(r.isValid).toBe(false)
  })
})

describe('parseCommand - flags', () => {
  it('parses --flag=value', () => {
    const r = parseCommand(
      '/test --name=alice',
      cmd({ arguments: [arg({ id: 'name', flag: 'name', type: 'string' })] })
    )
    expect(r.flags.name?.value).toBe('alice')
  })

  it('parses --flag value', () => {
    const r = parseCommand(
      '/test --name alice',
      cmd({ arguments: [arg({ id: 'name', flag: 'name', type: 'string' })] })
    )
    expect(r.flags.name?.value).toBe('alice')
  })

  it('parses short flag', () => {
    const r = parseCommand(
      '/test -n alice',
      cmd({ arguments: [arg({ id: 'name', flag: 'name', shortFlag: 'n', type: 'string' })] })
    )
    expect(r.flags.name?.value).toBe('alice')
  })

  it('reports unknown short flag', () => {
    const r = parseCommand(
      '/test -z hello',
      cmd({ arguments: [arg({ id: 'name', flag: 'name', shortFlag: 'n', type: 'string' })] })
    )
    expect(r.errors.some((e) => e.type === 'unknown_flag')).toBe(true)
  })

  it('reports missing required flag', () => {
    const r = parseCommand(
      '/test',
      cmd({
        arguments: [arg({ id: 'name', flag: 'name', type: 'string', required: true })],
      })
    )
    expect(r.errors.some((e) => e.type === 'missing_required')).toBe(true)
  })
})

describe('parseCommand - validation', () => {
  it('enforces minLength', () => {
    const r = parseCommand(
      '/test hi',
      cmd({
        arguments: [
          arg({
            id: 's',
            type: 'string',
            required: true,
            position: 0,
            validation: { minLength: 5 },
          }),
        ],
      })
    )
    expect(r.isValid).toBe(false)
  })

  it('enforces maxLength', () => {
    const r = parseCommand(
      '/test hellothere',
      cmd({
        arguments: [
          arg({
            id: 's',
            type: 'string',
            required: true,
            position: 0,
            validation: { maxLength: 3 },
          }),
        ],
      })
    )
    expect(r.isValid).toBe(false)
  })

  it('enforces pattern', () => {
    const r = parseCommand(
      '/test abc',
      cmd({
        arguments: [
          arg({
            id: 's',
            type: 'string',
            required: true,
            position: 0,
            validation: { pattern: '^\\d+$' },
          }),
        ],
      })
    )
    expect(r.isValid).toBe(false)
  })
})

describe('parseCommand - quoted args', () => {
  it('handles double quotes', () => {
    const r = parseCommand(
      '/test "hello world"',
      cmd({ arguments: [arg({ id: 's', type: 'string', position: 0 })] })
    )
    expect(r.args[0].value).toBe('hello world')
  })

  it('handles single quotes', () => {
    const r = parseCommand(
      "/test 'hi there'",
      cmd({ arguments: [arg({ id: 's', type: 'string', position: 0 })] })
    )
    expect(r.args[0].value).toBe('hi there')
  })
})

describe('argsToObject', () => {
  it('combines positional and flags into an object', () => {
    const parsed = parseCommand(
      '/test alice --role=admin',
      cmd({
        arguments: [
          arg({ id: 'user', type: 'string', position: 0 }),
          arg({ id: 'role', flag: 'role', type: 'string' }),
        ],
      })
    )
    const obj = argsToObject(parsed)
    expect(obj.user).toBe('alice')
    expect(obj.role).toBe('admin')
  })
})
