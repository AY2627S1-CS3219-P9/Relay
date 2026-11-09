import { DistributedRateLimiter, type RateLimitDecision } from './redisRateLimiter.js'

export type RateLimiter = {
  tryAcquire(userId: string): Promise<RateLimitDecision>
  disconnect?(): Promise<void>
}

export interface RateLimiterFactoryConfig {
  redisUrl: string
  windowMs: number
  perUserMaxRequests: number
  globalMaxRequests: number
}

export class RateLimiterFactory {
  private static instance: RateLimiter | null = null

  static create(config: RateLimiterFactoryConfig): RateLimiter {
    return new DistributedRateLimiter({
      redisUrl: config.redisUrl,
      windowMs: config.windowMs,
      perUserMaxRequests: config.perUserMaxRequests,
      globalMaxRequests: config.globalMaxRequests,
      namespace: 'credit_estimation',
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
