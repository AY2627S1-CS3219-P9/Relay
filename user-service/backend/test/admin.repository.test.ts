import { describe, expect, it } from 'vitest'
import { AdminRepository } from '../src/repositories/admin.repository.js'

process.env.KAFKA_TOPIC_USER_EVENTS ??= 'user-events'

describe('admin role changes', () => {
  it('does not demote in Cognito when session revocation is unavailable', async () => {
    const repository = new AdminRepository()
    let cognitoCalls = 0
    const internal = repository as unknown as {
      sessions: { revokeByCognitoSub: () => Promise<void> }
      client: { send: () => Promise<unknown> }
    }
    internal.sessions = {
      revokeByCognitoSub: async () => { throw new Error('database unavailable') },
    }
    internal.client = {
      send: async () => { cognitoCalls++; return {} },
    }
    await expect(repository.removeAdmin('admin@example.com', 'subject'))
      .rejects.toThrow('database unavailable')
    expect(cognitoCalls).toBe(0)
  })
})
