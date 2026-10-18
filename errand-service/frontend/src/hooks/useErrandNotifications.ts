import { useCallback, useEffect, useRef } from 'react'
import type { Errand } from '@relay/contracts'

/**
 * Subscribe to SSE notifications for errand status changes
 * @param errands - Current errands to subscribe to (can be Errand or DemoErrand)
 * @param onErrandUpdate - Callback when errand status changes
 */
export function useErrandNotifications<T extends { id: string; status: string }>(
  errands: T[],
  onErrandUpdate: (errandId: string, newStatus: string) => void,
) {
  const sourceRef = useRef<EventSource | null>(null)
  const connectedRef = useRef(false)

  useEffect(() => {
    // Only establish connection once, when errands become available
    if (connectedRef.current || errands.length === 0) {
      return
    }

    // Mark as connected before creating connection to prevent race conditions
    connectedRef.current = true

    // Create new connection
    const source = new EventSource('/api/errands/stream/notifications')

    source.onmessage = (e) => {
      if (e.data.startsWith(':')) return // Skip comments

      try {
        const event = JSON.parse(e.data)
        if (event.type === 'STATUS_CHANGED') {
          onErrandUpdate(event.errandId, event.newStatus)
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    source.onerror = (err) => {
      console.error('SSE connection error:', err)
      // SSE auto-reconnects after 3s by default
    }

    sourceRef.current = source

    return () => {
      source.close()
      connectedRef.current = false
    }
  }, [errands.length]) // Only connect when errand count changes (0 -> >0)

  return sourceRef.current
}
