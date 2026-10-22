import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { cognitoAuthMiddleware, generateMockJwt, verifyMockJwt } from '../src/middleware/cognito-auth.middleware.js'
import { adminMiddleware } from '../src/middleware/admin.middleware.js'
import type { Request } from 'express'

process.env.KAFKA_TOPIC_USER_EVENTS ??= 'user-events'

describe('super admin authorization', () => {
  it('resolves all three roles from configured Cognito groups', () => {
    for (const role of ['user', 'admin', 'super-admin'] as const) {
      const token = generateMockJwt({ sub: role, email: `${role}@example.com`, role })
      expect(verifyMockJwt(token).role).toBe(role)
    }
  })

  it('allows only a super admin through the management guard', () => {
    for (const role of ['user', 'admin', 'super-admin'] as const) {
      let error: unknown
      let allowed = false
      adminMiddleware({ user: { role } } as Request, {} as never, (result) => {
        if (result) error = result
        else allowed = true
      })
      if (role === 'super-admin') expect(allowed).toBe(true)
      else expect(error).toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    }
  })
})

describe('Cognito signing key lookup', () => {
  it('stops after one refresh when a key ID is unknown', async () => {
    const previousMode = process.env.AUTH_MODE
    const previousFetch = globalThis.fetch
    process.env.AUTH_MODE = 'cognito'
    let fetches = 0
    globalThis.fetch = async () => {
      fetches++
      return { ok: true, json: async () => ({ keys: [] }) } as Response
    }
    const token = jwt.sign({ sub: 'user-sub' }, 'test-secret', {
      algorithm: 'HS256', header: { kid: 'unknown' },
    })
    let status = 0
    const response = {
      status: (code: number) => {
        status = code
        return { json: () => undefined }
      },
    }
    try {
      await cognitoAuthMiddleware(
        { header: () => 'Bearer ' + token } as never,
        response as never,
        () => undefined,
      )
      expect(status).toBe(401)
      expect(fetches).toBe(2)
    } finally {
      globalThis.fetch = previousFetch
      if (previousMode === undefined) delete process.env.AUTH_MODE
      else process.env.AUTH_MODE = previousMode
    }
  })
})
