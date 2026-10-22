/** Kafka event types for user lifecycle events. */
export const UserEventTypes = {
  USER_REGISTERED: 'UserRegistered',
  USER_DELETED: 'UserDeleted',
} as const

export type UserEventType = (typeof UserEventTypes)[keyof typeof UserEventTypes]

/** Envelope shared by all user events. The payload remains the Cognito subject. */
export interface UserEvent {
  eventId: string
  eventType: UserEventType
  timestamp: string
  version: 1
  payload: { cognitoSub: string }
}

export type UserRegisteredEvent = UserEvent & {
  eventType: typeof UserEventTypes.USER_REGISTERED
}

export type UserDeletedEvent = UserEvent & {
  eventType: typeof UserEventTypes.USER_DELETED
}

export const UserTopics = {
  USER_EVENTS: 'user-events',
  USER_DLQ: 'user-events-dlq',
} as const

export type UserTopic = (typeof UserTopics)[keyof typeof UserTopics]

/** Rejected user event written by Credit Service to the user DLQ. */
export type UserEventDlqErrorCode =
  | 'USER_EVENT_INVALID'
  | 'USER_EVENT_DUPLICATE'
  | 'USER_EVENT_OUT_OF_ORDER'
  | 'USER_CREDIT_OPERATION_FAILED'

export type UserEventDlqMessage = {
  eventId: string
  eventType: UserEventType | 'UserEventInvalid'
  timestamp: string
  version: 1
  payload: { cognitoSub: string; metadata?: { rawEvent: string } }
  error: { code: UserEventDlqErrorCode; message: string }
}
