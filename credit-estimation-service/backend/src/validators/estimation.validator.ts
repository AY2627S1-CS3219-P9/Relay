import { CreditEstimationErrors } from '@relay/contracts'
import { EstimationServiceError } from '../types/estimation.types'

export const MAX_NAME_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 5000

/** Dangerous patterns to reject (XSS, injection, prompt injection) */
const dangerousPatterns = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe\b/i,
  /eval\(/i,
  /document\./i,
  /window\./i,
  /fetch\(/i,
  /XMLHttpRequest/i,
  /alert\(/i,
  /prompt\(/i,
  /confirm\(/i,
  /console\.(log|error|warn)/i,
  /process\./i,
  /require\(/i,
  /__proto__/i,
  /prototype/i,
]

function containsDangerousPatterns(text: string): boolean {
  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      return true
    }
  }
  return false
}

export function validateEstimateRequest(request: {
  name: string
  description: string
  serviceType: number
}): void {
  // Validate name
  if (typeof request.name !== 'string') {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Name must be a string',
      400,
      { name: 'Name must be a string' },
    )
  }

  if (request.name.length === 0) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Name cannot be empty',
      400,
      { name: 'Name cannot be empty' },
    )
  }

  if (request.name.length > MAX_NAME_LENGTH) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      `Name must be at most ${MAX_NAME_LENGTH} characters`,
      400,
      { name: `Name must be at most ${MAX_NAME_LENGTH} characters` },
    )
  }

  if (containsDangerousPatterns(request.name)) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Name contains invalid characters',
      400,
      { name: 'Name contains invalid characters' },
    )
  }

  // Validate description
  if (typeof request.description !== 'string') {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Description must be a string',
      400,
      { description: 'Description must be a string' },
    )
  }

  if (request.description.length === 0) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Description cannot be empty',
      400,
      { description: 'Description cannot be empty' },
    )
  }

  if (request.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
      400,
      { description: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters` },
    )
  }

  if (containsDangerousPatterns(request.description)) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Description contains invalid characters',
      400,
      { description: 'Description contains invalid characters' },
    )
  }

  // Validate service type
  if (typeof request.serviceType !== 'number') {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Service type must be a number',
      400,
      { serviceType: 'Service type must be a number' },
    )
  }

  if (!Number.isInteger(request.serviceType)) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Service type must be an integer',
      400,
      { serviceType: 'Service type must be an integer' },
    )
  }

  if (request.serviceType < 0 || request.serviceType > 4) {
    throw new EstimationServiceError(
      CreditEstimationErrors.INVALID_INPUT,
      'Service type must be between 0 and 4',
      400,
      { serviceType: 'Service type must be between 0 and 4' },
    )
  }
}
