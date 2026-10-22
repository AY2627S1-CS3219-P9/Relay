import { z } from 'zod'
import { UserServiceError } from '../types/user.types.js'

const email = z.email().trim().toLowerCase()
const password = z.string().min(1)
const loginSchema = z.object({ email, password })
const registerSchema = loginSchema.extend({ passwordConfirmation: password })
const resendSchema = z.object({ email })
const verificationSchema = loginSchema.extend({ code: z.string().trim().min(1) })
const changePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
  newPasswordConfirmation: password,
})

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new UserServiceError(
      'VALIDATION_FAILED',
      'The authentication request is invalid.',
      400,
      Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])),
    )
  }
  return result.data
}

export const validateLogin = (input: unknown) => parse(loginSchema, input)
export const validateRegister = (input: unknown) => parse(registerSchema, input)
export const validateResend = (input: unknown) => parse(resendSchema, input)
export const validateVerification = (input: unknown) => parse(verificationSchema, input)
export const validateChangePassword = (input: unknown) => parse(changePasswordSchema, input)
