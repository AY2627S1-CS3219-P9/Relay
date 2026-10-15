import { useEffect, useState } from 'react'
import type { ErrandApi, SupplierErrandSummary } from '@relay/contracts'
import { ErrorMessage, GlassCard, IconButton, LoadingState, RelayButton, StatusBadge } from '@relay/ui'

function deadline(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function route(value: SupplierErrandSummary['pickupLocation']) {
  return `${value.buildingName} · Level ${value.floorNumber}`
}

export function SupplierErrandPanel({ supplierId, api, onAccepted }: { supplierId: string; api?: ErrandApi; onAccepted?: () => void }) {
  const [errands, setErrands] = useState<SupplierErrandSummary[]>([])
  const [selected, setSelected] = useState<SupplierErrandSummary>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!api) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    void api.getSupplierErrandView({ scope: 'explore', supplierId })
      .then(({ errands: loaded }) => { if (!cancelled) { setErrands(loaded); setError('') } })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, supplierId])

  async function accept() {
    if (!selected || !api) return
    setAccepting(true)
    setActionError('')
    try {
      await api.acceptErrand(selected.id)
      setErrands((current) => current.filter((errand) => errand.id !== selected.id))
      setSelected(undefined)
      onAccepted?.()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to accept this errand.')
    } finally { setAccepting(false) }
  }

  if (selected) return (
    <GlassCard className="supplier-errand-detail relay-mobile-sheet-surface" aria-label="Errand details">
      <div className="errand-detail-header">
        <div>
          <p className="errand-eyebrow">AVAILABLE ERRAND</p>
          <h2>{selected.deliveryDetails.description}</h2>
          <div className="errand-detail-meta"><StatusBadge tone="success">Open</StatusBadge><span>Due {deadline(selected.expiresAt)}</span></div>
        </div>
        <IconButton label="Close errand details" onClick={() => { setSelected(undefined); setActionError('') }}>×</IconButton>
      </div>
      <div className="errand-route-card">
        <div><span className="route-label">PICKUP</span><strong>{route(selected.pickupLocation)}</strong></div>
        <div><span className="route-label">DELIVERY</span><strong>{selected.deliveryDetails.description}</strong></div>
      </div>
      {selected.deliveryDetails.instructions && <div className="errand-info-card"><span className="route-label">INSTRUCTIONS</span><p>{selected.deliveryDetails.instructions}</p></div>}
      <div className="errand-reward-card"><div><span className="route-label">REWARD</span><strong>{selected.creditAmount} credits</strong></div><small>Transferred after delivery is confirmed</small></div>
      {actionError && <ErrorMessage message={actionError} />}
      <div className="errand-action-stack"><RelayButton variant="primary" disabled={accepting} onClick={() => void accept()}>{accepting ? 'Accepting…' : 'Accept errand'}</RelayButton></div>
    </GlassCard>
  )

  return <div className="supplier-errands" aria-label="Available errands">
    <div className="supplier-errands-heading"><span>Errands</span></div>
    {loading && <LoadingState label="Loading errands" />}
    {!loading && error && <ErrorMessage message={error} />}
    {!loading && !error && errands.length === 0 && <p className="supplier-no-errands">No errands</p>}
    {!loading && !error && errands.length > 0 && <div className="supplier-errand-list">{errands.map((errand) => <button className="supplier-errand-row" type="button" key={errand.id} onClick={() => setSelected(errand)}><span><strong>{errand.deliveryDetails.description}</strong><small>{route(errand.pickupLocation)} · Due {deadline(errand.expiresAt)}</small></span><b>{errand.creditAmount} cr</b></button>)}</div>}
  </div>
}
