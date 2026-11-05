import { useCallback, useEffect, useRef } from 'react'
import { ErrandNotificationTypes, type Errand, type ErrandNotification } from '@relay/contracts'

/**
 * Subscribe to SSE notifications for errand status changes
 * @param authenticatedSubject - Current user's sub for authentication
 * @param errands - Current errands to subscribe to
 * @param onErrandUpdate - Callback when errand notification received
 * @param refetchErrands - Function to refetch errand list
 * @param refetchErrandDetails - Function to refetch a specific errand
 */
export function useErrandNotifications<T extends { id: string; status: string }>(
  authenticatedSubject: string | undefined,
  errands: T[],
  onErrandUpdate: (event: ErrandNotification) => void,
  refetchErrands: () => Promise<void>,
  refetchErrandDetails: (errandId: string) => Promise<void>,
) {
  const sourceRef = useRef<EventSource | null>(null)
  const connectedRef = useRef(false)
  const eventIdCacheRef = useRef<string[]>([])
  const CACHE_SIZE = 100

  useEffect(() => {
    // Only establish connection once, when errands become available and user is authenticated
    if (connectedRef.current || errands.length === 0 || !authenticatedSubject) {
      return
    }

    // Mark as connected before creating connection to prevent race conditions
    connectedRef.current = true

    // Create new connection
    const source = new EventSource('/api/notifications/stream')

    source.onopen = () => {
      console.log('SSE connection opened for errand notifications')
      // Refresh relevant lists AND any open errand details on connection/reconnection
      void refetchErrands()
      // Refetch details for open errands displayed in UI
      const openErrands = document.querySelectorAll('[data-errand-id]')
      for (const el of openErrands) {
        const errandId = el.getAttribute('data-errand-id')
        if (errandId) void refetchErrandDetails(errandId)
      }
    }

    source.onmessage = (e) => {
      if (e.data.startsWith(':')) return // Skip SSE comments

      try {
        const event: ErrandNotification = JSON.parse(e.data)

        // Check for duplicate using eventId
        if (eventIdCacheRef.current.includes(event.eventId)) {
          return // Duplicate - ignore
        }

        // Add to cache (keep bounded)
        eventIdCacheRef.current.push(event.eventId)
        if (eventIdCacheRef.current.length > CACHE_SIZE) {
          eventIdCacheRef.current.shift()
        }

        // Notify about the update
        onErrandUpdate(event)

        // Handle by event type
        if (event.type === ErrandNotificationTypes.ERRAND_CREATED) {
          // New errand created - refresh lists (may be relevant)
          void refetchErrands()
        } else if (event.type === ErrandNotificationTypes.ERRAND_STATUS_CHANGED) {
          // Errand status changed - refresh lists AND affected open details
          void refetchErrands()
          void refetchErrandDetails(event.errandId)
        } else if (event.type === ErrandNotificationTypes.ERRAND_DELETED) {
          // Errand deleted - refresh lists AND remove from UI
          void refetchErrands()
          // Remove from UI cache if present
          const el = document.querySelector(`[data-errand-id="${event.errandId}"]`)
          if (el) el.remove()
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    source.onerror = (err) => {
      console.error('SSE connection error:', err)
      // EventSource manages automatic reconnection with browser-controlled backoff
    }

    sourceRef.current = source

    return () => {
      source.close()
      connectedRef.current = false
      eventIdCacheRef.current = []
    }
  }, [authenticatedSubject, errands.length, refetchErrands, refetchErrandDetails, onErrandUpdate])

  return sourceRef.current
}
