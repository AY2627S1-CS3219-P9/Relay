import { z } from 'zod'
import { ErrandErrors, type CreateErrandRequest } from '@relay/contracts'
import { ErrandServiceError } from '../types/errand.types.js'

const errandLocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  buildingName: z.string().trim().min(1),
  floorNumber: z.number().int(),
})

const deliveryDetailsSchema = z.object({
  description: z.string().trim().min(1),
  instructions: z.string().trim().min(1).optional(),
})

const createErrandSchema = z.object({
  supplierId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200, 'Name must be no more than 200 characters'),
  pickupLocation: errandLocationSchema,
  deliveryDetails: deliveryDetailsSchema,
  creditAmount: z.number().int().positive(),
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() > Date.now(), 'Expiry must be in the future')
    .optional(),
  serviceType: z.number().int(),
  supplierName: z.string().trim().min(1),
})

export function validateCreateErrand(input: unknown): CreateErrandRequest {
  const result = createErrandSchema.safeParse(input)
  if (result.success) return result.data

  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'request'
    fieldErrors[field] ??= issue.message
  }

  throw new ErrandServiceError(
    ErrandErrors.INVALID_ERRAND,
    'The errand request is invalid.',
    400,
    fieldErrors,
  )
}
