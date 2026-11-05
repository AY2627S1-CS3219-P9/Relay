import express, { type Request, type Response } from 'express'
import { ErrandNotificationEventStream } from './services/notificationEventStream.js'
import { ErrandNotificationConsumer } from './consumers/consumer.js'
import { getEnv } from './config/env.js'
import { userAuthMiddleware, type AuthenticatedUser } from '@relay/user-auth-backend-middleware'
import {
  ErrandErrors,
  ErrandEventTypes,
  ErrandNotification,
  ErrandNotificationType,
  ErrandNotificationTypes,
  type ErrandEvent,
} from '@relay/contracts'

const KAFKA_CONSUMER_GROUP_ID = 'relay-errand-notifications'

function isValidEvent(event: any): event is ErrandEvent {
  if (!event || typeof event !== 'object') return false
  if (
    typeof event.eventId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.eventId)
  )
    return false
  if (
    ![
      'ErrandCreated',
      'ErrandStatusChanged',
      'ErrandCompleted',
      'ErrandCancelled',
      'ErrandExpired',
      'ErrandDeleted',
      'ErrandCreationFailed',
    ].includes(event.eventType)
  )
    return false
  if (typeof event.timestamp !== 'string' || isNaN(Date.parse(event.timestamp))) return false
  if (event.version !== 1) return false
  if (!event.payload || typeof event.payload !== 'object') return false
  if (typeof event.payload.errandId !== 'string') return false
  if (!Array.isArray(event.payload.recipientSubs)) return false
  return true
}

export function createNotificationApp(eventStream: ErrandNotificationEventStream, kafka: any) {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/healthz', (_req, res) => {
    res.status(200).send('ok\n')
  })

  // SSE endpoint for notifications
  app.get('/api/notifications/stream', userAuthMiddleware, (req: Request, res: Response) =>
    notificationStreamHandler(eventStream)(req, res),
  )

  // Kafka consumer for errand events
  const consumer = new ErrandNotificationConsumer(kafka)
  const env = getEnv()

  const startConsumer = async () => {
    await consumer.start(KAFKA_CONSUMER_GROUP_ID, [env.kafkaTopicErrandEvents], {
      [env.kafkaTopicErrandEvents]: async (payload: any) => {
        try {
          const rawPayload = JSON.parse(payload.message.value as string)

          // Validate event structure
          if (!isValidEvent(rawPayload)) {
            console.error('Invalid event payload:', rawPayload)
            return
          }

          const event = rawPayload as ErrandEvent
          await processErrandEvent(eventStream, event)
        } catch (error) {
          console.error('Error processing event:', error)
          // Re-throw to trigger Kafka retry with exponential backoff
          throw error
        }
      },
    })
  }

  return { app, consumer, startConsumer }
}

export async function processErrandEvent(
  eventStream: ErrandNotificationEventStream,
  event: ErrandEvent,
): Promise<void> {
  const { eventId, eventType, timestamp, payload } = event

  // Kafka consumer group offsets already handle deduplication,
  // so we don't need additional deduplication here.

  const sseEventType = mapKafkaToSseEvent(eventType)

  console.log(`Processing event ${eventId} of type ${eventType} for errand ${payload.errandId}`)

  // Get recipientSubs with actor exclusion
  const recipientSubs = (payload as any).recipientSubs as string[]

  if (!recipientSubs || !Array.isArray(recipientSubs) || recipientSubs.length === 0) {
    console.warn(`Event ${eventId} missing valid recipientSubs. Skipping notification.`, {
      eventType,
      payload,
    })
    return
  }

  // Filter actor from recipients (actor should not receive notification for their own action)
  const actorSub = payload.actorSub
  const filteredRecipients = actorSub
    ? recipientSubs.filter((sub) => sub !== actorSub)
    : recipientSubs

  if (filteredRecipients.length === 0) {
    console.log(`Event ${eventId}: all recipients filtered (actor exclusion), nothing to send`)
    return
  }

  const newStatus = payload.errandStatus
  if (!newStatus) {
    console.warn(`Event ${eventId} missing errandStatus. Skipping notification.`, {
      eventType,
      payload,
    })
    return
  }

  const oldStatus = payload.previousStatus
  if (!oldStatus) {
    console.warn(`Event ${eventId} missing previousStatus. Skipping notification.`, {
      eventType,
      payload,
    })
    return
  }

  const notification: ErrandNotification = {
    eventId,
    type: sseEventType,
    errandId: payload.errandId,
    timestamp,
    oldStatus,
    newStatus,
  }

  // Publish to subscribers
  await eventStream.publish(filteredRecipients, notification)
}

function mapKafkaToSseEvent(kafkaType: string): ErrandNotificationType {
  switch (kafkaType) {
    case ErrandEventTypes.ERRAND_CREATED:
      return ErrandNotificationTypes.ERRAND_CREATED
    case ErrandEventTypes.ERRAND_STATUS_CHANGED:
    case ErrandEventTypes.ERRAND_COMPLETED:
    case ErrandEventTypes.ERRAND_CANCELLED:
    case ErrandEventTypes.ERRAND_EXPIRED:
      return ErrandNotificationTypes.ERRAND_STATUS_CHANGED
    case ErrandEventTypes.ERRAND_DELETED:
      return ErrandNotificationTypes.ERRAND_DELETED
    default:
      throw new Error(`Unknown event type: ${kafkaType}`)
  }
}

function notificationStreamHandler(eventStream: ErrandNotificationEventStream) {
  return (req: Request, res: Response): void => {
    const user = (req as any).user as AuthenticatedUser | undefined
    if (!user) {
      res.status(401).json({ code: ErrandErrors.UNAUTHENTICATED, message: 'Not authenticated' })
      return
    }

    const userSub = user.sub

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // Send initial connection confirmed
    res.write(': connected\n\n')

    // Subscribe user to errand events and get subscription ID
    const subscriptionId = eventStream.subscribe(userSub, res)

    // Handle client disconnect
    req.on('close', () => {
      eventStream.unsubscribe(userSub, subscriptionId)
      res.end()
    })
  }
}
