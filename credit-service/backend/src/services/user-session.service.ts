import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditServiceError } from '../types/credit.types.js'

const sessionResponse = z.object({
  ok: z.literal(true),
  data: z.object({ user: z.object({ subject: z.string().min(1) }) }),
})

export class UserSessionService {
  private readonly env = getEnv()

  async validate(cookie: string): Promise<string> {
    if (!cookie.trim()) {
      throw new CreditServiceError('UNAUTHENTICATED', 'Authentication is required.', 401)
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.env.userApiTimeout)
    try {
      const response = await fetch(`${this.env.userApiUrl}/internal/user/session/validate`, {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'x-user-service-token': this.env.userServiceInternalToken,
        },
        signal: controller.signal,
      })
      if (response.status === 401 || response.status === 403) {
        throw new CreditServiceError('UNAUTHENTICATED', 'The session is invalid or expired.', 401)
      }
      if (!response.ok) throw new Error('User Service session validation failed.')
      const session = sessionResponse.parse(await response.json())
      return session.data.user.subject
    } finally {
      clearTimeout(timeout)
    }
  }
}
