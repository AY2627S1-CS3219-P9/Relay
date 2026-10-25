const rateLimits = new Map<string, { count: number; resetTime: number }>()

/**
 * Check if user is rate limited
 * @param userId - User ID (from session)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Window size in milliseconds
 * @returns true if user can proceed, false if rate limited
 */
export function checkRateLimit(
  userId: string,
  maxRequests: number = 10,
  windowMs: number = 60000,
): boolean {
  const now = Date.now()

  let state = rateLimits.get(userId)
  if (!state) {
    state = { count: 0, resetTime: now + windowMs }
  }

  // Reset window if expired
  if (now > state.resetTime) {
    state.count = 0
    state.resetTime = now + windowMs
  }

  // Check if rate limited
  if (state.count >= maxRequests) {
    return false
  }

  // Increment count
  state.count++
  rateLimits.set(userId, state)

  return true
}

export function getRateLimitStatus(userId: string): {
  remaining: number
  resetTime: number
} {
  const now = Date.now()

  const state = rateLimits.get(userId)
  if (!state) {
    return { remaining: 10, resetTime: now + 60000 }
  }

  if (now > state.resetTime) {
    return { remaining: 10, resetTime: now + 60000 }
  }

  return {
    remaining: Math.max(0, 10 - state.count),
    resetTime: state.resetTime,
  }
}
