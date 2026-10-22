import { describe, expect, it, vi } from 'vitest'
import { SessionService } from '../src/services/session.service.js'
import { getEnv } from '../src/config/env.js'
import { SessionRepository, type StoredSession } from '../src/repositories/session.repository.js'
import { sessionMiddleware } from '../src/middleware/session.middleware.js'
import type { UserRepository } from '../src/repositories/user.repository.js'

process.env.KAFKA_TOPIC_USER_EVENTS ??= 'user-events'

function accessToken(exp: number) {
  return 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature'
}

function setup(profileLookup: () => Promise<unknown> = async () => null) {
  let stored: StoredSession | undefined
  let revoked = false
  const sessions = {
    create: async (data: StoredSession) => { stored = data; return data },
    revokeByTokenHash: async () => { revoked = true },
  } as unknown as SessionRepository
  const profiles = { findByCognitoSub: profileLookup } as unknown as UserRepository
  return { service: new SessionService(sessions, profiles), getStored: () => stored, wasRevoked: () => revoked }
}

const identity = { subject: 'user-sub', email: 'user@example.com', emailVerified: true, role: 'user' as const }

describe('session lifetime and login errors', () => {
  it('uses the configured session duration even when the Cognito token expires sooner', async () => {
    const expiry = Math.floor(Date.now() / 1000) + 60
    const { service, getStored } = setup()
    await service.createSession(identity, accessToken(expiry))
    const remainingSeconds = (getStored()!.expiresAt.getTime() - Date.now()) / 1000
    expect(remainingSeconds).toBeGreaterThan(getEnv().sessionTtlSeconds - 5)
    expect(remainingSeconds).toBeLessThanOrEqual(getEnv().sessionTtlSeconds)
  })

  it('revokes a newly stored session if profile lookup fails', async () => {
    const { service, wasRevoked } = setup(async () => { throw new Error('database unavailable') })
    await expect(service.createSession(identity, accessToken(Math.floor(Date.now() / 1000) + 60)))
      .rejects.toThrow('database unavailable')
    expect(wasRevoked()).toBe(true)
  })

  it('preserves invalid credential errors during verification and login', async () => {
    const { service } = setup()
    ;(service as unknown as { client: { send: (command: { constructor: { name: string } }) => Promise<unknown> } }).client = {
      send: async (command) => {
        if (command.constructor.name === 'ConfirmSignUpCommand') return {}
        const error = new Error('denied')
        error.name = 'NotAuthorizedException'
        throw error
      },
    }
    await expect(service.submitOtpAndLogin({
      email: 'user@example.com', password: 'wrong', code: '123456',
    })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
  })
})

describe('session lookup failures', () => {
  it('passes database failures to the server error handler', async () => {
    const failure = new Error('database unavailable')
    const spy = vi.spyOn(SessionRepository.prototype, 'findActiveByTokenHash').mockRejectedValue(failure)
    let passed: unknown
    const response = {
      status: () => { throw new Error('database failure must not become 401') },
    }
    try {
      await sessionMiddleware(
        { header: () => 'relay_session=example' } as never,
        response as never,
        (error: unknown) => { passed = error },
      )
      expect(passed).toBe(failure)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('password change', () => {
  it('revokes stored sessions after Cognito accepts the change', async () => {
    const actions: string[] = []
    const service = new SessionService(
      { revokeByCognitoSub: async (sub: string) => { actions.push('revoke:' + sub) } } as unknown as SessionRepository,
      {} as UserRepository,
    )
    ;(service as unknown as { client: { send: () => Promise<unknown> } }).client = {
      send: async () => { actions.push('change'); return {} },
    }
    await service.changePassword(
      { cognitoSub: 'user-sub', cognitoAccessToken: 'token' } as StoredSession,
      { currentPassword: 'old', newPassword: 'new', newPasswordConfirmation: 'new' },
    )
    expect(actions).toEqual(['change', 'revoke:user-sub'])
  })
})

describe('authentication request validation', () => {
  it('returns field errors before calling Cognito for malformed credentials', async () => {
    const { service } = setup()
    await expect(service.login({ email: 'invalid', password: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 400 })
    await expect(service.register({ email: 'invalid', password: '', passwordConfirmation: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 400 })
    await expect(service.resendVerification({ email: 'invalid' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 400 })
  })
})

describe('session configuration', () => {
  it('rejects invalid authentication modes and session lifetimes', () => {
    const mode = process.env.AUTH_MODE
    const ttl = process.env.SESSION_TTL_SECONDS
    try {
      process.env.AUTH_MODE = 'cognit'
      expect(() => getEnv()).toThrow('AUTH_MODE must be mock or cognito')
      process.env.AUTH_MODE = 'mock'
      process.env.SESSION_TTL_SECONDS = '0'
      expect(() => getEnv()).toThrow('SESSION_TTL_SECONDS must be a positive integer')
    } finally {
      if (mode === undefined) delete process.env.AUTH_MODE
      else process.env.AUTH_MODE = mode
      if (ttl === undefined) delete process.env.SESSION_TTL_SECONDS
      else process.env.SESSION_TTL_SECONDS = ttl
    }
  })
})
