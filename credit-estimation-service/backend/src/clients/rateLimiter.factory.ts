/**
 * Rate limiter factory - chooses between in-memory and Redis-based
 * This allows gradual migration from in-memory to distributed
 */

import { SlidingWindowRateLimiter } from './rateLimiter.js'
import { DistributedRateLimiter } from './redisRateLimiter.js'

export type RateLimiter = {
  tryAcquire(key?: string): Promise<boolean> | boolean
  getRemaining?(key?: string): number | Promise<number>
  getNextReset?(key?: string): number | Promise<number>
  disconnect?(): Promise<void>
}

export interface RateLimiterFactoryConfig {
  redisUrl: string
  windowMs: number
  maxRequests: number
}

export class RateLimiterFactory {
  static create(config: RateLimiterFactoryConfig): RateLimiter {
    if (!config.redisUrl) {
      throw new Error('redisUrl required for rate limiter')
    }
    return new DistributedRateLimiter({
      windowMs: config.windowMs ?? 60 * 1000,
      maxRequests: config.maxRequests ?? 20,
      redisUrl: config.redisUrl,
    })
  }
}
