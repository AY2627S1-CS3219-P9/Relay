import { ERRAND_ERROR_MAP } from '../constants/errand-error-map'
import { ErrandServiceError } from '../types/errand.types'

/**
 * Translates repository error messages to API errors using the error map.
 * If the error message is not in the map, the original error is thrown.
 */
export function translateError(error: Error): ErrandServiceError {
  const message = error.message as keyof typeof ERRAND_ERROR_MAP
  const mappedError = ERRAND_ERROR_MAP[message]

  if (mappedError) {
    return new ErrandServiceError(mappedError.code, mappedError.userMessage, mappedError.statusCode)
  }

  throw error
}
