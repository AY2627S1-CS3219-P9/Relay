import { describe, expect, it } from 'vitest'
import { AdminRepository } from '../src/repositories/admin.repository.js'

process.env.KAFKA_TOPIC_USER_EVENTS ??= 'user-events'

describe('admin role changes', () => {
  it('updates Cognito without a session database dependency', async () => {
    const repository = new AdminRepository()
    let cognitoCalls = 0
    const internal = repository as unknown as { client: { send: () => Promise<unknown> } }
    internal.client = { send: async () => { cognitoCalls++; return {} } }
    await expect(repository.removeAdmin('admin@example.com', 'subject')).resolves.toBeUndefined()
    expect(cognitoCalls).toBe(1)
  })
})
