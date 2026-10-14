import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { RemoteAppProps } from '@relay/contracts'
import { BellIcon, BoltIcon, ClipboardPlusIcon, FilterIcon, IconButton, LocationIcon, PlusIcon, RelayButton, SlidingSegmentedControl, Spacer, StatusBadge } from '@relay/ui'
import { demoErrands } from './demoErrands'
import { CreateErrandCard } from './components/CreateErrandCard'
import { ErrandDetailCard } from './components/ErrandDetailCard'
import { ErrandFilterPanel, type ErrandFilters } from './components/ErrandFilterPanel'
import { ErrandMap } from './components/ErrandMap'
import type { DemoErrand } from './types'
import { STATUS_LABELS, formatDeadline, formatRoute, statusTone } from './types'

const NUS_CENTER = { lat: 1.2966, lng: 103.7764 }
const lifecycleRank: Record<DemoErrand['status'], number> = { OPEN: 0, ACCEPTED: 1, PICKED_UP: 2, DELIVERED: 3, CONFIRMED: 4, CANCELLED: 5, EXPIRED: 6 }

export default function App({ errandViewContext, navigateTo, openErrandView, userProfile, userLocation, requestUserLocation, presentation = 'full' }: RemoteAppProps) {
  const [errands, setErrands] = useState<DemoErrand[]>(demoErrands)
  const [selectedErrandId, setSelectedErrandId] = useState<string>()
  const [showFilters, setShowFilters] = useState(false)
  const [location, setLocation] = useState(userLocation)
  const [map, setMap] = useState<LeafletMap>()
  const [filters, setFilters] = useState<ErrandFilters>({ statuses: ['OPEN', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CONFIRMED'], serviceTypes: [0, 1, 2, 3, 4], sort: 'lifecycle' })
  const view = errandViewContext?.view ?? 'requests'
  const selectedErrand = errands.find((errand) => errand.id === selectedErrandId)
  const isCourierView = view === 'explore' || (errandViewContext?.view === 'supplier' && errandViewContext.scope === 'explore')
  const role = isCourierView ? 'courier' : 'requester'

  const visibleErrands = useMemo(() => {
    const filtered = errands.filter((errand) => filters.statuses.includes(errand.status) && filters.serviceTypes.includes(errand.serviceType))
    return [...filtered].sort((left, right) => {
      if (filters.sort === 'deadline') return left.expiresAt.localeCompare(right.expiresAt)
      if (filters.sort === 'start') return left.id.localeCompare(right.id)
      if (filters.sort === 'distance' && location) return distance(left, location) - distance(right, location)
      return lifecycleRank[left.status] - lifecycleRank[right.status]
    })
  }, [errands, filters, location])

  function closeRemote() { navigateTo?.('supplier') }

  function updateErrand(action: 'accept' | 'pickup' | 'deliver' | 'confirm' | 'cancel' | 'delete', id: string) {
    // TODO: call the corresponding Errand Service lifecycle endpoint and refresh the errand.
    const nextStatus: Partial<Record<typeof action, DemoErrand['status']>> = { accept: 'ACCEPTED', pickup: 'PICKED_UP', deliver: 'DELIVERED', confirm: 'CONFIRMED', cancel: 'CANCELLED' }
    const next = nextStatus[action]
    if (next) setErrands((current) => current.map((errand) => errand.id === id ? { ...errand, status: next } : errand))
    if (action === 'delete') { setErrands((current) => current.filter((errand) => errand.id !== id)); setSelectedErrandId(undefined) }
  }

  async function locateMe() {
    const next = await requestUserLocation?.()
    if (next) setLocation(next)
  }

  if (view === 'create' || presentation === 'card') {
    return <main className="errand-card-shell relay-design-system"><CreateErrandCard initialSupplierId={errandViewContext?.view === 'create' ? errandViewContext.supplierId : undefined} onClose={closeRemote} onCreated={() => { /* TODO: refresh request list after Errand Service confirms creation. */ closeRemote() }} /></main>
  }

  return (
    <main className="errand-map-shell relay-design-system">
      <ErrandMap errands={visibleErrands} center={location ?? NUS_CENTER} userLocation={location} selectedId={selectedErrandId} onSelect={(errand) => setSelectedErrandId(errand.id)} onMapReady={setMap} />
      <div className="errand-top-controls map-top-menu">
        <RelayButton variant="secondary" className="glass-pill glass-control" aria-label="Credits"><BoltIcon className="errand-control-icon" /><span>0 cr</span></RelayButton>
        <SlidingSegmentedControl className="errand-segment-control" ariaLabel="Errand view" options={[{ value: 'explore', label: 'Explore' }, { value: 'requests', label: 'My Requests' }]} value={isCourierView ? 'explore' : 'requests'} onChange={(next) => { /* TODO: load the selected map mode from Errand Service. */ openErrandView?.(next === 'explore' ? { view: 'explore' } : { view: 'requests' }) }} />
        <RelayButton variant="secondary" className="glass-pill profile-chip" aria-label="Profile" onClick={() => navigateTo?.('user')}>{userProfile?.profilePictureUrl && <img className="profile-chip-avatar" src={userProfile.profilePictureUrl} alt="" />}{userProfile?.username ?? 'Complete profile'}</RelayButton>
      </div>
      <div className="errand-map-controls">
        <RelayButton variant="secondary" className="map-control-button" onClick={() => setShowFilters(true)} aria-label="Open errand filters"><FilterIcon /></RelayButton>
        <RelayButton variant="secondary" className="map-control-button" onClick={() => void locateMe()} aria-label="Center map"><LocationIcon /></RelayButton>
        <RelayButton variant="secondary" className="map-control-button" onClick={() => map?.zoomIn()} aria-label="Zoom in"><PlusIcon /></RelayButton>
        <RelayButton variant="secondary" className="map-control-button" onClick={() => map?.zoomOut()} aria-label="Zoom out">−</RelayButton>
      </div>
      <div className="errand-bottom-controls map-bottom-menu"><RelayButton variant="secondary" className="updates-action"><BellIcon /><span>Updates</span><b>2</b></RelayButton><Spacer /><RelayButton variant="primary" className="new-request-action" onClick={() => { /* TODO: ask the host to open { view: 'create' }. */ openErrandView?.({ view: 'create' }) }}><ClipboardPlusIcon /><span>New request</span></RelayButton></div>
      {selectedErrand && <div className="errand-detail-popover"><ErrandDetailCard errand={selectedErrand} role={role} onClose={() => setSelectedErrandId(undefined)} onAction={(action) => updateErrand(action, selectedErrand.id)} /></div>}
      {!selectedErrand && view === 'requests' && visibleErrands[0] && <button className="my-request-card" type="button" onClick={() => setSelectedErrandId(visibleErrands[0].id)}><span className="request-card-label">My request <StatusBadge tone={statusTone(visibleErrands[0].status)}>{STATUS_LABELS[visibleErrands[0].status]}</StatusBadge></span><strong>{visibleErrands[0].name}</strong><small>{formatRoute(visibleErrands[0].pickupLocation)} → {formatRoute(visibleErrands[0].deliveryLocation)}</small><em>{visibleErrands[0].creditAmount} cr reserved · Due {formatDeadline(visibleErrands[0].expiresAt)}</em></button>}
      {showFilters && <ErrandFilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />}
      <IconButton className="errand-close-map" label="Back to suppliers" onClick={closeRemote}>×</IconButton>
    </main>
  )
}

function distance(errand: DemoErrand, location: { lat: number; lng: number }) { const lat = errand.pickupLocation.lat - location.lat; const lng = errand.pickupLocation.lng - location.lng; return lat * lat + lng * lng }
