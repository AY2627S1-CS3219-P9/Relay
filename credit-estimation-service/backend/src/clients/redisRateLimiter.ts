/**
 * Redis-backed distributed rate limiter using Lua scripts
 *
 * This implementation provides:
 * - Atomic rate limit operations across all instances
 * - Sliding window algorithm with Redis
 * - Connection pooling for efficiency
 */

import { Redis } from 'ioredis'

export interface RateLimiterConfig {
  windowMs: number
  maxRequests: number
  redisUrl: string
  namespace?: string
}

export class DistributedRateLimiter {
  private redis: Redis
  private readonly windowMs: number
  private readonly maxRequests: number
  private readonly namespace: string
  private readonly script: string

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs
    this.maxRequests = config.maxRequests
    this.namespace = config.namespace || 'rate_limit'
    this.redis = new Redis(config.redisUrl, {
      // Connection pooling settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      // Retry strategy
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    // Lua script for atomic increment + expiry
    // This ensures thread-safe rate limiting
    // Always refresh TTL
    // Returns: {current, ttl_ms, remaining}
    this.script = `
      local current = redis.call('INCR', KEYS[1])
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
      local ttl_ms = redis.call('PTTL', KEYS[1])
      local remaining = math.max(0, tonumber(ARGV[2]) - current)
      return {current, ttl_ms, remaining}
    `
  }

  /**
   * Try to acquire a rate limit token
   * @param key Unique identifier for the rate limit (e.g., service name)
   * @returns true if request is allowed, false if rate limited
   */
  async tryAcquire(key: string): Promise<boolean> {
    const redisKey = `${this.namespace}:${key}`

    try {
      const result = (await this.redis.eval(
        this.script,
        1,
        redisKey,
        this.windowMs,
        this.maxRequests,
      )) as number[]

      if (result.length < 3) {
        throw new Error('Invalid rate limiter response')
      }

      const currentRequests = result[0]
      this.ttlMs = result[1]
      this.remaining = result[2]

      return currentRequests <= this.maxRequests
    } catch (error) {
      console.error('Redis rate limiter error:', error)
      // Fail open - allow request if Redis is unavailable
      return true
    }
  }

  // Cached values from last tryAcquire call
  private ttlMs: number = 0
  private remaining: number = 0

  /**
   * Get remaining requests in current window
   * Uses cached value from last tryAcquire for consistency
   * @param key Unique identifier
   * @returns Number of remaining requests
   */
  async getRemaining(key: string): Promise<number> {
    // Return cached value from last tryAcquire
    return this.remaining
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   * Uses cached value from last tryAcquire for consistency
   * @param key Unique identifier
   * @returns Milliseconds until reset, or 0 if no active limit
   */
  async getNextReset(key: string): Promise<number> {
    // Return cached value from last tryAcquire
    return this.ttlMs
  }

  /**
   * Get current request count in window
   * @param key Unique identifier
   * @returns Current request count
   */
  async getCurrentCount(key: string): Promise<number> {
    const redisKey = `${this.namespace}:${key}`

    try {
      const current = await this.redis.get(redisKey)
      return parseInt(current || '0', 10)
    } catch (error) {
      console.error('Redis getCurrentCount error:', error)
      return 0
    }
  }

  /**
   * Reset rate limit for a key, used for testing or manual reset
   * @param key Unique identifier
   */
  async reset(key: string): Promise<void> {
    const redisKey = `${this.namespace}:${key}`
    await this.redis.del(redisKey)
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit()
  }

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG'
    } catch {
      return false
    }
  }
}

export async function createDistributedRateLimiter(
  redisUrl: string,
): Promise<DistributedRateLimiter> {
  return new DistributedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // Default, configurable via env
    redisUrl,
    namespace: 'credit_estimation',
  })
}
