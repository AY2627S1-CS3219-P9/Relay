import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UserSessionService } from '../dist/services/user-session.service.js'

process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused'
process.env.CREDIT_SERVICE_INTERNAL_TOKEN ??= 'test-token'
process.env.KAFKA_TOPIC_USER_EVENTS ??= 'user-events'
process.env.KAFKA_TOPIC_ERRAND_EVENTS ??= 'errand-events'
process.env.KAFKA_TOPIC_ERRAND_DLQ ??= 'errand-events-dlq'

for (const missing of ['emailVerified', 'profileCreated']) {
  test(`credit access requires ${missing}`, async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(JSON.stringify({
      ok: true,
      data: { user: { subject: 'user-sub', emailVerified: true, profileCreated: true, [missing]: false } },
    }), { status: 200 })
    try {
      await assert.rejects(new UserSessionService().validate('relay_session=test'), {
        code: 'FORBIDDEN', statusCode: 403,
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
}

test('credit access accepts a completed session', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    data: { user: { subject: 'user-sub', emailVerified: true, profileCreated: true } },
  }), { status: 200 })
  try {
    assert.equal(await new UserSessionService().validate('relay_session=test'), 'user-sub')
  } finally {
    globalThis.fetch = originalFetch
  }
})
