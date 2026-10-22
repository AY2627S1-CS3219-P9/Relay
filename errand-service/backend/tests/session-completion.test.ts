import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionMiddleware } from '../src/middleware/session.middleware.js'

process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused'

afterEach(() => vi.restoreAllMocks())

describe('session completion', () => {
  for (const missing of ['emailVerified', 'profileCreated'] as const) {
    it(`rejects sessions missing ${missing}`, async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
        ok: true,
        data: { user: {
          subject: 'user-sub', email: 'user@example.com', role: 'user',
          emailVerified: true, profileCreated: true, [missing]: false,
        } },
      }), { status: 200 }))
      const next = vi.fn()
      await sessionMiddleware(
        { header: () => 'relay_session=test' } as never,
        {} as never,
        next,
      )
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FORBIDDEN', statusCode: 403,
      }))
    })
  }

  it('passes a completed session to the next handler', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      data: { user: {
        subject: 'user-sub', email: 'user@example.com', role: 'user',
        emailVerified: true, profileCreated: true,
      } },
    }), { status: 200 }))
    const request = { header: () => 'relay_session=test' } as never
    const next = vi.fn()
    await sessionMiddleware(request, {} as never, next)
    expect(next).toHaveBeenCalledWith()
    expect((request as { user?: { sub: string } }).user?.sub).toBe('user-sub')
  })
})
