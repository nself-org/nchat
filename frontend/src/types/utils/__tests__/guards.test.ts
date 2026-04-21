/**
 * Unit tests for type guards.
 */
import {
  isString,
  isNonEmptyString,
  isNumber,
  isFiniteNumber,
  isInteger,
  isPositiveNumber,
  isNonNegativeNumber,
  isBoolean,
  isNull,
  isUndefined,
  isNullish,
  isDefined,
  isFunction,
  isSymbol,
  isBigInt,
  isObject,
  isPlainObject,
  isArray,
  isArrayOf,
  isNonEmptyArray,
  isDate,
  isDateString,
  isPromise,
  isError,
  isUUID,
  isEmail,
  isURL,
  isHexColor,
  isSlug,
  isUserRole,
  isPresenceStatus,
  isChannelType,
  isDirectMessageChannel,
  isGroupDMChannel,
  isDMChannel,
  isSystemMessage,
  hasAttachments,
  hasReactions,
  hasThread,
  isReply,
  isApiError,
  isFieldError,
  hasFieldErrors,
  isUser,
  isAdmin,
  isModerator,
  isActiveUser,
  isOnline,
  isNotificationType,
  isUnreadNotification,
  isHighPriorityNotification,
  hasKeys,
  hasShape,
  assertType,
  narrowOrDefault,
} from '../guards'

describe('primitive guards', () => {
  it('isString', () => {
    expect(isString('x')).toBe(true)
    expect(isString('')).toBe(true)
    expect(isString(1)).toBe(false)
    expect(isString(null)).toBe(false)
  })

  it('isNonEmptyString', () => {
    expect(isNonEmptyString('x')).toBe(true)
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString(5)).toBe(false)
  })

  it('isNumber', () => {
    expect(isNumber(5)).toBe(true)
    expect(isNumber(NaN)).toBe(false)
    expect(isNumber('5')).toBe(false)
  })

  it('isFiniteNumber', () => {
    expect(isFiniteNumber(5)).toBe(true)
    expect(isFiniteNumber(Infinity)).toBe(false)
    expect(isFiniteNumber(NaN)).toBe(false)
  })

  it('isInteger', () => {
    expect(isInteger(5)).toBe(true)
    expect(isInteger(5.5)).toBe(false)
  })

  it('isPositiveNumber', () => {
    expect(isPositiveNumber(1)).toBe(true)
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-1)).toBe(false)
  })

  it('isNonNegativeNumber', () => {
    expect(isNonNegativeNumber(0)).toBe(true)
    expect(isNonNegativeNumber(1)).toBe(true)
    expect(isNonNegativeNumber(-1)).toBe(false)
  })

  it('isBoolean', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
    expect(isBoolean('true')).toBe(false)
  })

  it('isNull/isUndefined/isNullish/isDefined', () => {
    expect(isNull(null)).toBe(true)
    expect(isNull(undefined)).toBe(false)
    expect(isUndefined(undefined)).toBe(true)
    expect(isNullish(null)).toBe(true)
    expect(isNullish(undefined)).toBe(true)
    expect(isNullish(0)).toBe(false)
    expect(isDefined(0)).toBe(true)
    expect(isDefined(null)).toBe(false)
    expect(isDefined(undefined)).toBe(false)
  })

  it('isFunction', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction('x')).toBe(false)
  })

  it('isSymbol', () => {
    expect(isSymbol(Symbol('x'))).toBe(true)
    expect(isSymbol('x')).toBe(false)
  })

  it('isBigInt', () => {
    expect(isBigInt(BigInt(1))).toBe(true)
    expect(isBigInt(1)).toBe(false)
  })
})

describe('structural guards', () => {
  it('isObject', () => {
    expect(isObject({})).toBe(true)
    expect(isObject([])).toBe(false)
    expect(isObject(null)).toBe(false)
  })

  it('isPlainObject', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
  })

  it('isArray/isNonEmptyArray', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1])).toBe(true)
    expect(isArray('arr')).toBe(false)
    expect(isNonEmptyArray([1])).toBe(true)
    expect(isNonEmptyArray([])).toBe(false)
  })

  it('isArrayOf', () => {
    expect(isArrayOf([1, 2], isNumber)).toBe(true)
    expect(isArrayOf([1, 'x'], isNumber)).toBe(false)
    expect(isArrayOf('notarr', isNumber)).toBe(false)
  })

  it('isDate', () => {
    expect(isDate(new Date())).toBe(true)
    expect(isDate(new Date('invalid'))).toBe(false)
    expect(isDate('2020-01-01')).toBe(false)
  })

  it('isDateString', () => {
    expect(isDateString('2020-01-01')).toBe(true)
    expect(isDateString('not-a-date')).toBe(false)
    expect(isDateString(42)).toBe(false)
  })

  it('isPromise', () => {
    expect(isPromise(Promise.resolve(1))).toBe(true)
    expect(isPromise({ then: () => {} })).toBe(true)
    expect(isPromise({})).toBe(false)
  })

  it('isError', () => {
    expect(isError(new Error('x'))).toBe(true)
    expect(isError({})).toBe(false)
  })
})

describe('format guards', () => {
  it('isUUID', () => {
    expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isUUID('not-a-uuid')).toBe(false)
  })

  it('isEmail', () => {
    expect(isEmail('a@b.co')).toBe(true)
    expect(isEmail('not-an-email')).toBe(false)
  })

  it('isURL', () => {
    expect(isURL('https://example.com')).toBe(true)
    expect(isURL('not-a-url')).toBe(false)
  })

  it('isHexColor', () => {
    expect(isHexColor('#fff')).toBe(true)
    expect(isHexColor('#abcdef')).toBe(true)
    expect(isHexColor('#aabbccdd')).toBe(true)
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('#zz')).toBe(false)
  })

  it('isSlug', () => {
    expect(isSlug('hello-world')).toBe(true)
    expect(isSlug('a1b2')).toBe(true)
    expect(isSlug('Bad Slug')).toBe(false)
    expect(isSlug('-nope')).toBe(false)
  })
})

describe('domain guards', () => {
  it('isUserRole', () => {
    expect(isUserRole('owner')).toBe(true)
    expect(isUserRole('admin')).toBe(true)
    expect(isUserRole('moderator')).toBe(true)
    expect(isUserRole('member')).toBe(true)
    expect(isUserRole('guest')).toBe(true)
    expect(isUserRole('unknown')).toBe(false)
  })

  it('isPresenceStatus', () => {
    expect(isPresenceStatus('online')).toBe(true)
    expect(isPresenceStatus('invalid')).toBe(false)
  })

  it('isChannelType', () => {
    expect(isChannelType('public')).toBe(true)
    expect(isChannelType('private')).toBe(true)
    expect(isChannelType('direct')).toBe(true)
    expect(isChannelType('group_dm')).toBe(true)
    expect(isChannelType('nope')).toBe(false)
  })

  it('channel type narrowing', () => {
    expect(isDirectMessageChannel({ type: 'direct', participant: {} })).toBe(true)
    expect(isDirectMessageChannel({ type: 'public' })).toBe(false)
    expect(isGroupDMChannel({ type: 'group_dm', participants: [] })).toBe(true)
    expect(isDMChannel({ type: 'direct' })).toBe(true)
    expect(isDMChannel({ type: 'group_dm' })).toBe(true)
    expect(isDMChannel({ type: 'public' })).toBe(false)
  })
})

describe('message guards', () => {
  const baseMsg: any = { id: '1', type: 'text', userId: 'u', channelId: 'c', content: 'hi' }

  it('isSystemMessage', () => {
    expect(isSystemMessage({ ...baseMsg, type: 'system' })).toBe(true)
    expect(isSystemMessage({ ...baseMsg, type: 'user_joined' })).toBe(true)
    expect(isSystemMessage({ ...baseMsg, type: 'text' })).toBe(false)
  })

  it('hasAttachments', () => {
    expect(hasAttachments({ ...baseMsg, attachments: [{ id: 'a' }] })).toBe(true)
    expect(hasAttachments({ ...baseMsg, attachments: [] })).toBe(false)
    expect(hasAttachments(baseMsg)).toBe(false)
  })

  it('hasReactions', () => {
    expect(hasReactions({ ...baseMsg, reactions: [{ emoji: 'x' }] })).toBe(true)
    expect(hasReactions(baseMsg)).toBe(false)
  })

  it('hasThread', () => {
    expect(hasThread({ ...baseMsg, threadInfo: { replyCount: 2 } })).toBe(true)
    expect(hasThread({ ...baseMsg, threadInfo: { replyCount: 0 } })).toBe(false)
    expect(hasThread(baseMsg)).toBe(false)
  })

  it('isReply', () => {
    expect(isReply({ ...baseMsg, replyToId: 'parent' })).toBe(true)
    expect(isReply(baseMsg)).toBe(false)
  })
})

describe('api error guards', () => {
  it('isApiError', () => {
    expect(isApiError({ success: false, error: { code: 'x' } })).toBe(true)
    expect(isApiError({ success: true })).toBe(false)
    expect(isApiError(null)).toBe(false)
  })

  it('isFieldError', () => {
    expect(isFieldError({ field: 'email', message: 'bad' })).toBe(true)
    expect(isFieldError({ field: 'email' })).toBe(false)
  })

  it('hasFieldErrors', () => {
    expect(hasFieldErrors({ fieldErrors: [{ field: 'a', message: 'b' }] })).toBe(true)
    expect(hasFieldErrors({})).toBe(false)
  })
})

describe('user guards', () => {
  const user: any = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'a@b.co',
    displayName: 'Alice',
    role: 'member',
    isActive: true,
    isBot: false,
    presence: { status: 'online' },
  }

  it('isUser', () => {
    expect(isUser(user)).toBe(true)
    expect(isUser({ ...user, id: 'bad' })).toBe(false)
    expect(isUser(null)).toBe(false)
  })

  it('isAdmin / isModerator', () => {
    expect(isAdmin({ ...user, role: 'owner' })).toBe(true)
    expect(isAdmin({ ...user, role: 'admin' })).toBe(true)
    expect(isAdmin({ ...user, role: 'member' })).toBe(false)
    expect(isModerator({ ...user, role: 'moderator' })).toBe(true)
    expect(isModerator({ ...user, role: 'member' })).toBe(false)
  })

  it('isActiveUser / isOnline', () => {
    expect(isActiveUser(user)).toBe(true)
    expect(isActiveUser({ ...user, isBot: true })).toBe(false)
    expect(isActiveUser({ ...user, isActive: false })).toBe(false)
    expect(isOnline(user)).toBe(true)
    expect(isOnline({ ...user, presence: { status: 'offline' } })).toBe(false)
  })
})

describe('notification guards', () => {
  it('isNotificationType', () => {
    expect(isNotificationType('mention')).toBe(true)
    expect(isNotificationType('direct_message')).toBe(true)
    expect(isNotificationType('unknown')).toBe(false)
  })

  it('isUnreadNotification', () => {
    expect(isUnreadNotification({ status: 'unread' } as any)).toBe(true)
    expect(isUnreadNotification({ status: 'read' } as any)).toBe(false)
  })

  it('isHighPriorityNotification', () => {
    expect(isHighPriorityNotification({ priority: 'high' } as any)).toBe(true)
    expect(isHighPriorityNotification({ priority: 'urgent' } as any)).toBe(true)
    expect(isHighPriorityNotification({ priority: 'normal' } as any)).toBe(false)
  })
})

describe('generic guards', () => {
  it('hasKeys', () => {
    expect(hasKeys({ a: 1, b: 2 }, ['a'])).toBe(true)
    expect(hasKeys({ a: 1 }, ['a', 'b'])).toBe(false)
    expect(hasKeys(null, ['a'])).toBe(false)
  })

  it('hasShape', () => {
    expect(hasShape({ a: 'x', b: 1 }, { a: isString, b: isNumber })).toBe(true)
    expect(hasShape({ a: 'x' }, { a: isNumber })).toBe(false)
  })

  it('assertType throws on mismatch', () => {
    expect(() => assertType(5, isString)).toThrow()
    expect(() => assertType('x', isString)).not.toThrow()
  })

  it('narrowOrDefault', () => {
    expect(narrowOrDefault('x', isString, 'def')).toBe('x')
    expect(narrowOrDefault(5, isString, 'def')).toBe('def')
  })
})
