import { z } from 'zod'
import { AuthError } from '../types/auth.types.js'
const email = z.email().trim().toLowerCase()
const password = z.string().min(1)
export const loginSchema = z.object({ email, password })
export const registerSchema = loginSchema.extend({ passwordConfirmation: password })
export const resendSchema = z.object({ email })
export const verificationSchema = loginSchema.extend({ code: z.string().trim().min(1) })
export const passwordSchema = z.object({ currentPassword: password, newPassword: password, newPasswordConfirmation: password })
export const adminSchema = z.object({ email })
export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw new AuthError('VALIDATION_FAILED', 'The authentication request is invalid.', 400, Object.fromEntries(result.error.issues.map(issue => [issue.path.join('.'), issue.message])))
  return result.data
}
