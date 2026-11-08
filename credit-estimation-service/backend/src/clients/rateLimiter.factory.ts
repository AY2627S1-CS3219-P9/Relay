/**
 * Rate limiter factory - distributed rate limiting by default, in-memory fallback
 *
 * Note: Redis connectivity is tested at runtime via tryAcquire().
 * If Redis fails, automatically switches to in-memory rate limiting for subsequent calls.
 */

import { DistributedRateLimiter } from './redisRateLimiter.js'
import { PerServiceSlidingWindowRateLimiter } from './perServiceRateLimiter.js'

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
  fallbackMaxRequests: number
}

// Fallback rate limiter that tries distributed first, switches to in-memory on failure
class FallbackRateLimiter implements RateLimiter {
  private distributed: DistributedRateLimiter | null = null
  private inMemory: PerServiceSlidingWindowRateLimiter | null = null
  private useInMemory: boolean = false
  private readonly windowMs: number
  private readonly maxRequests: number
  private readonly fallbackMaxRequests: number

  constructor(config: {
    redisUrl: string
    windowMs: number
    maxRequests: number
    fallbackMaxRequests: number
  }) {
    this.windowMs = config.windowMs ?? 60 * 1000
    this.maxRequests = config.maxRequests ?? 20
    this.fallbackMaxRequests = config.fallbackMaxRequests ?? 10

    if (config.redisUrl) {
      this.distributed = new DistributedRateLimiter({
        windowMs: config.windowMs ?? 60 * 1000,
        maxRequests: config.maxRequests ?? 20,
        redisUrl: config.redisUrl,
        namespace: 'credit_estimation',
      })
    }

    this.inMemory = new PerServiceSlidingWindowRateLimiter({
      windowMs: config.windowMs ?? 60 * 1000,
      maxRequests: this.fallbackMaxRequests,
    })
  }

  async tryAcquire(key: string): Promise<boolean> {
    // If in fallback mode, use in-memory
    if (this.useInMemory) {
      return this.inMemory?.tryAcquire(key) ?? true
    }

    // Try distributed first
    if (this.distributed) {
      try {
        const allowed = await this.distributed.tryAcquire(key)
        return allowed
      } catch (error) {
        console.log('Redis unavailable, switching to in-memory rate limiter')
        this.useInMemory = true
      }
    }

    // Use in-memory as fallback
    return this.inMemory?.tryAcquire(key) ?? true
  }

  async getRemaining(key: string): Promise<number> {
    if (this.useInMemory && this.inMemory) {
      return this.inMemory.getRemaining(key)
    }
    if (this.distributed) {
      return this.distributed.getRemaining(key)
    }
    return this.maxRequests
  }

  async getNextReset(key: string): Promise<number> {
    if (this.useInMemory && this.inMemory) {
      return this.inMemory.getNextReset(key)
    }
    if (this.distributed) {
      return this.distributed.getNextReset(key)
    }
    return 0
  }

  async disconnect(): Promise<void> {
    if (this.distributed) {
      await this.distributed.disconnect()
    }
  }
}

export class RateLimiterFactory {
  private static instance: RateLimiter | null = null

  static create(config: RateLimiterFactoryConfig): RateLimiter {
    return new FallbackRateLimiter({
      redisUrl: config.redisUrl,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      fallbackMaxRequests: config.fallbackMaxRequests,
    })
  }

  static async getInstance(config: RateLimiterFactoryConfig): Promise<RateLimiter> {
    if (!RateLimiterFactory.instance) {
      RateLimiterFactory.instance = this.create(config)
    }
    return RateLimiterFactory.instance
  }

  static reset(): void {
    RateLimiterFactory.instance = null
  }
}
