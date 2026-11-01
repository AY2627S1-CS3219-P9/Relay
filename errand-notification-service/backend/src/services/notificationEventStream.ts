import { type ServerResponse } from 'node:http'
import type { ErrandNotification, ErrandNotificationType } from '@relay/contracts'

export type ErrandNotificationSubscriber = 'requester' | 'courier'

export class ErrandNotificationEventStream {
  // userSub -> Set<{ response: ServerResponse }>
  private subscribers: Map<string, Set<{ response: ServerResponse }>> = new Map()

  subscribe(userId: string, res: ServerResponse): void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set())
    }
    this.subscribers.get(userId)!.add({ response: res })
  }

  unsubscribe(userId: string): void {
    const users = this.subscribers.get(userId)
    if (users) {
      users.clear()
      if (users.size === 0) {
        this.subscribers.delete(userId)
      }
    }
  }

  /**
   * Push notification to specific users
   */
  publish(userSubs: string[], notification: ErrandNotification): void {
    for (const userSub of userSubs) {
      const users = this.subscribers.get(userSub)
      if (!users) continue

      for (const { response } of users) {
        response.write(`data: ${JSON.stringify(notification)}\n\n`)
      }
    }
  }

  /**
   * Get all subscribers for a user
   */
  getSubscribers(userId: string): Set<{ response: ServerResponse }> | undefined {
    return this.subscribers.get(userId)
  }
}
