import '@relay/ui/styles.css'
import './styles.css'
import { useEffect, useState } from 'react'
import type { RemoteAppProps } from '@relay/contracts'
import type { ErrandStatus, SupplierErrandSummary } from '@relay/contracts/errand'
import { GlassCard, IconButton, LoadingState, RelayButton, StatusBadge } from '@relay/ui'
import { ErrandApiError, httpErrandApi } from './errandApi'

const statusLabels: Record<ErrandStatus, string> = {
  OPEN: 'Open',
  ACCEPTED: 'Accepted',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  CONFIRMED: 'Confirmed',
}

function statusTone(status: ErrandStatus): 'neutral' | 'success' | 'danger' | 'warning' {
  if (status === 'OPEN' || status === 'DELIVERED') return 'success'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'danger'
  if (status === 'ACCEPTED' || status === 'PICKED_UP') return 'warning'
  return 'neutral'
}

function formatDeadline(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

export default function App({ errandViewContext, navigateTo }: RemoteAppProps) {
  const [errands, setErrands] = useState<SupplierErrandSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!errandViewContext) {
      setErrands([])
      setErrorMessage('')
      return
    }

    let cancelled = false
    setLoading(true)
    setErrorMessage('')

    void httpErrandApi
      .getSupplierErrandView({
        scope: errandViewContext.scope,
        supplierId: errandViewContext.supplierId,
      })
      .then(({ errands: loadedErrands }) => {
        if (!cancelled) setErrands(loadedErrands)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ErrandApiError
              ? error.message
              : 'Unable to load errands for this supplier.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [errandViewContext])

  if (!errandViewContext) {
    return (
      <main className="errand-empty-state relay-design-system">
        <GlassCard className="errand-view-card">
          <p className="errand-eyebrow">ERRANDS</p>
          <h1>Select a supplier to view errands</h1>
          <p>Choose a supplier on the map to see its available errands.</p>
          {navigateTo && (
            <RelayButton variant="secondary" onClick={() => navigateTo('supplier')}>
              Back to suppliers
            </RelayButton>
          )}
        </GlassCard>
      </main>
    )
  }

  const supplierName = errandViewContext.supplier?.name ?? 'Selected supplier'
  const heading = errandViewContext.scope === 'mine' ? 'My requests' : 'Open errands'

  return (
    <main className="errand-page relay-design-system">
      <GlassCard className="errand-view-card" aria-label={`${heading} for ${supplierName}`}>
        <div className="errand-view-header">
          <div>
            <p className="errand-eyebrow">{heading.toUpperCase()}</p>
            <h1>{supplierName}</h1>
          </div>
          <IconButton scale={1.25} label="Back to suppliers" onClick={() => navigateTo?.('supplier')}>
            ×
          </IconButton>
        </div>

        {loading && <LoadingState label="Loading errands" />}
        {!loading && errorMessage && (
          <p className="errand-error" role="alert">
            {errorMessage}
          </p>
        )}
        {!loading && !errorMessage && errands.length === 0 && (
          <p className="errand-empty-copy">There are no errands for this supplier yet.</p>
        )}
        {!loading && !errorMessage && errands.length > 0 && (
          <div className="errand-list">
            {errands.map((errand) => (
              <article className="errand-list-item" key={errand.id}>
                <div className="errand-list-item-header">
                  <StatusBadge tone={statusTone(errand.status)}>
                    {statusLabels[errand.status]}
                  </StatusBadge>
                  <span>{errand.creditAmount} credits</span>
                </div>
                <p>{errand.deliveryDetails.description}</p>
                <small>
                  {errand.pickupLocation.buildingName} · Floor {errand.pickupLocation.floorNumber}
                  {' · '}Due {formatDeadline(errand.expiresAt)}
                </small>
              </article>
            ))}
          </div>
        )}
      </GlassCard>
    </main>
  )
}
