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

  useEffect(() => {
    // Close existing connection if errands changed significantly
    if (sourceRef.current) {
      sourceRef.current.close()
      sourceRef.current = null
    }

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
    }
  }, []) // Keep connection open for the lifetime of the component

  return sourceRef.current
}
