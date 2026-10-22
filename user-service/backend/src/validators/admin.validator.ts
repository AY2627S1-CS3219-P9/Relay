import { z } from 'zod'
import { UserServiceError } from '../types/user.types.js'

const adminEmailSchema = z.object({ email: z.email().trim().toLowerCase() })

export function validateAdminEmail(input: unknown): string {
  const parsed = adminEmailSchema.safeParse(input)
  if (!parsed.success) {
    throw new UserServiceError('VALIDATION_FAILED', 'A valid user email is required.', 400, {
      email: 'Enter a valid email address.',
    })
  }
  return parsed.data.email
}
