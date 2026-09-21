import { z } from 'zod'
import type { ImageContentType, ImageUpload } from '../storage/image-storage.js'
import { UserServiceError } from '../types/user.types.js'

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCOUNT_DELETION_CONFIRMATION = 'DELETE'

export const usernameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{3,50}$/, 'Username must contain 3–50 alphanumeric characters.')

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    profilePicture: z.string().optional(),
  })
  .refine((value) => value.username !== undefined || value.profilePicture !== undefined, {
    message: 'At least one profile field is required.',
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export function validateUpdateProfile(input: unknown): UpdateProfileInput {
  const result = updateProfileSchema.safeParse(input)
  if (!result.success) {
    throw new UserServiceError(
      'INVALID_REQUEST',
      'The profile update request is invalid.',
      400,
      Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message]),
      ),
    )
  }
  return result.data
}

function decodeBase64Payload(payload: string): Buffer {
  const normalized = payload.replace(/\s/g, '')
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new UserServiceError('INVALID_REQUEST', 'The profile picture data is invalid.', 400)
  }

  const buffer = Buffer.from(normalized, 'base64')
  if (buffer.length === 0 || buffer.length >= MAX_PROFILE_IMAGE_BYTES) {
    throw new UserServiceError('INVALID_REQUEST', 'The image must be smaller than 5 MB.', 400)
  }
  return buffer
}

export function validateProfileImage(dataUrl: string): ImageUpload {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=\s]+)$/i)
  if (!match) {
    throw new UserServiceError('INVALID_REQUEST', 'Choose a JPG or PNG image.', 400, {
      profilePicture: 'Only image/jpeg and image/png data URLs are supported.',
    })
  }

  const contentType = match[1].toLowerCase() as ImageContentType
  const body = decodeBase64Payload(match[2])
  const extension = contentType === 'image/png' ? 'png' : 'jpg'

  return { body, contentType, extension }
}

export function validateDeletionConfirmation(value: unknown): void {
  if (value !== ACCOUNT_DELETION_CONFIRMATION) {
    throw new UserServiceError('INVALID_REQUEST', 'Deletion confirmation is invalid.', 400, {
      confirmation: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm account deletion.`,
    })
  }
}
