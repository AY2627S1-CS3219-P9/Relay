import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Errand, ErrandStatus, ProfileAnchor, RemoteAppProps, ServiceType } from '@relay/contracts'
import {
  BellIcon,
  BoltIcon,
  BubblePopover,
  ClipboardPlusIcon,
  FilterIcon,
  LocationIcon,
  PlusIcon,
  RelayButton,
  RelayCardAnchor,
  SlidingSegmentedControl,
  Spacer,
  StatusBadge,
  type BubbleAnchor,
} from '@relay/ui'
import { CreateErrandCard } from './components/CreateErrandCard'
import { ErrandDetailCard } from './components/ErrandDetailCard'
import { ErrandFilterPanel, type ErrandFilters } from './components/ErrandFilterPanel'
import { ErrandMap } from './components/ErrandMap'
import { STATUS_LABELS, formatDeadline, formatRoute, statusTone } from './types'
import { useErrandNotifications } from './hooks/useErrandNotifications'

const NUS_CENTER = { lat: 1.2966, lng: 103.7764 }
const lifecycleRank: Record<ErrandStatus, number> = {
  DELIVERED: 0,
  PICKED_UP: 1,
  ACCEPTED: 2,
  OPEN: 3,
  EXPIRED: 4,
  CANCELLED: 5,
  CONFIRMED: 6,
  DELETED: 7,
}

export default function App({
  errandViewContext,
  navigateTo,
  openErrandView,
  openProfile,
  userProfile,
  authenticatedSubject,
  userLocation,
  requestUserLocation,
  mapViewport,
  onMapViewportChange,
  mapActive,
  presentation,
  errandApi,
  supplierApi,
}: RemoteAppProps) {
  const [errands, setErrands] = useState<Errand[]>([])
  const [selectedErrandId, setSelectedErrandId] = useState<string>()
  const [selectedErrandAnchor, setSelectedErrandAnchor] = useState<BubbleAnchor>()
  const [showFilters, setShowFilters] = useState(false)
  const [location, setLocation] = useState(userLocation)
  const [map, setMap] = useState<LeafletMap>()
  const [createAnchor, setCreateAnchor] = useState<BubbleAnchor>()
  const [filters, setFilters] = useState<ErrandFilters>({
    statuses: ['OPEN', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CONFIRMED', 'EXPIRED'],
    serviceTypes: [0, 1, 2, 3, 4],
    sort: 'lifecycle',
  })
  const view = errandViewContext?.view ?? 'requests'
  const notificationCount = 2
  const selectedErrand = errands.find((errand) => errand.id === selectedErrandId)
  const isCourierView =
    view === 'explore' ||
    (errandViewContext?.view === 'supplier' && errandViewContext.scope === 'explore')
  const isRequester = authenticatedSubject === selectedErrand?.requesterSub
  const role = isCourierView ? 'courier' : isRequester ? 'requester' : 'courier'

  useEffect(() => {
    if (!errandApi || view === 'create' || view === 'supplier') return
    const load =
      view === 'requests' ? errandApi.getErrands({ scope: 'mine' }) : errandApi.getErrands()
    void load
      .then(({ errands: loaded }) => {
        const accepted =
          view === 'my-errands'
            ? loaded.filter((errand) => errand.courierSub === authenticatedSubject)
            : loaded
        setErrands(accepted)
      })
      .catch(() => undefined)
  }, [errandApi, authenticatedSubject, view])
  const handleViewportChange = useCallback(
    (viewport: { center: { lat: number; lng: number }; zoom: number }) => {
      onMapViewportChange?.(viewport)
    },
    [onMapViewportChange],
  )

  function persistCurrentViewport() {
    if (!map) return
    const center = map.getCenter()
    handleViewportChange({ center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() })
  }

  const visibleErrands = useMemo(() => {
    if (view === 'my-errands') return errands
    const filtered = errands.filter(
      (errand) =>
        filters.statuses.includes(errand.status) &&
        filters.serviceTypes.includes(errand.supplierDetails.serviceType as ServiceType),
    )
    return [...filtered].sort((left, right) => {
      if (filters.sort === 'deadline') return left.expiresAt.localeCompare(right.expiresAt)
      if (filters.sort === 'start') return left.id.localeCompare(right.id)
      if (filters.sort === 'distance' && location)
        return distance(left, location) - distance(right, location)
      return lifecycleRank[left.status] - lifecycleRank[right.status]
    })
  }, [errands, filters, location])

  function closeRemote() {
    if (presentation === 'card') {
      navigateTo?.('supplier')
      return
    }
    openErrandView?.({ view: 'requests' })
  }

  function openProfileCard(button: HTMLButtonElement) {
    if (!openProfile) {
      navigateTo?.('user')
      return
    }
    const { top, left, right, bottom, width, height } = button.getBoundingClientRect()
    const anchor: ProfileAnchor = { top, left, right, bottom, width, height }
    openProfile(anchor)
  }

  async function updateErrand(
    action: 'accept' | 'pickup' | 'deliver' | 'confirm' | 'cancel' | 'drop' | 'delete',
    id: string,
  ) {
    if (errandApi) {
      const actions = {
        accept: errandApi.acceptErrand,
        pickup: errandApi.pickupErrand,
        deliver: errandApi.deliverErrand,
        confirm: errandApi.confirmErrand,
        cancel: errandApi.cancelErrand,
        drop: errandApi.dropErrand,
        delete: errandApi.deleteErrand,
      }
      if (action === 'delete') {
        await actions.delete(id)
        setErrands((current) => current.filter((errand) => errand.id !== id))
        setSelectedErrandId(undefined)
        return
      }
      if (action === 'drop') {
        const response = await actions.drop(id)
        setErrands((current) =>
          current.map((errand) =>
            errand.id === id
              ? {
                  ...errand,
                  courierName: undefined,
                  courierProfilePictureUrl: undefined,
                }
              : errand,
          ),
        )
        return
      }
      const response = await actions[action](id)
      setErrands((current) =>
        current.map((errand) =>
          errand.id === id ? { ...errand, ...response.errand } : errand,
        ),
      )
      if (action === 'accept') openErrandView?.({ view: 'my-errands' })
      return
    }
    const nextStatus: Partial<Record<typeof action, ErrandStatus>> = {
      accept: 'ACCEPTED',
      pickup: 'PICKED_UP',
      deliver: 'DELIVERED',
      confirm: 'CONFIRMED',
      cancel: 'CANCELLED',
      drop: 'OPEN',
    }
    const next = nextStatus[action]
    if (next)
      setErrands((current) =>
        current.map((errand) =>
          errand.id === id
            ? {
                ...errand,
                status: next,
                ...(action === 'drop' ? { courierName: undefined, courierSub: null } : {}),
              }
            : errand,
        ),
      )
    if (action === 'delete') {
      setErrands((current) => current.filter((errand) => errand.id !== id))
      setSelectedErrandId(undefined)
    }
  }

  // SSE notifications for other users' changes
  const handleErrandUpdate = useCallback((errandId: string, newStatus: string) => {
    setErrands((current) =>
      current.map((errand) =>
        errand.id === errandId ? { ...errand, status: newStatus as ErrandStatus } : errand,
      ),
    )
  }, [])

  useErrandNotifications(errands, handleErrandUpdate)

  async function locateMe() {
    const next = await requestUserLocation?.()
    if (next) setLocation(next)
  }

  const createAnchorForView =
    createAnchor ?? (errandViewContext?.view === 'create' ? errandViewContext.anchor : undefined)
  const createCard = view === 'create' && (
    <RelayCardAnchor
      placement={createAnchorForView ? 'anchored' : 'center-right'}
      anchor={createAnchorForView}
      preferredSide="top-end"
      className="errand-create-popover"
    >
      <CreateErrandCard
        initialSupplierId={
          errandViewContext?.view === 'create' ? errandViewContext.supplierId : undefined
        }
        onClose={closeRemote}
        onCreated={() => openErrandView?.({ view: 'requests' })}
        errandApi={errandApi}
        supplierApi={supplierApi}
      />
    </RelayCardAnchor>
  )

  if (presentation === 'card' && createCard) {
    return <main className="errand-create-overlay relay-design-system">{createCard}</main>
  }

  return (
    <main className="errand-map-shell relay-design-system">
      <ErrandMap
        errands={visibleErrands}
        center={mapViewport?.center ?? location ?? NUS_CENTER}
        userLocation={location}
        selectedId={selectedErrandId}
        onSelect={(errand, anchor) => {
          setSelectedErrandId(errand.id)
          setSelectedErrandAnchor(anchor)
        }}
        onMapClick={() => {
          setSelectedErrandId(undefined)
          setSelectedErrandAnchor(undefined)
        }}
        onMapReady={setMap}
        zoom={mapViewport?.zoom ?? 16}
        onViewportChange={handleViewportChange}
        active={mapActive ?? true}
      />
      <div className="errand-top-controls map-top-menu">
        <RelayButton
          variant="secondary"
          size="map-pill"
          className="glass-pill glass-control"
          aria-label="Credits"
        >
          <BoltIcon className="errand-control-icon" />
          <span>0 cr</span>
        </RelayButton>
        <SlidingSegmentedControl
          size="map"
          ariaLabel="Errand view"
          options={[
            { value: 'explore', label: 'Explore' },
            { value: 'requests', label: 'My Requests' },
            { value: 'my-errands', label: 'My Errands' },
          ]}
          value={view === 'my-errands' ? 'my-errands' : isCourierView ? 'explore' : 'requests'}
          onChange={(next) => {
            persistCurrentViewport()
            openErrandView?.(
              next === 'explore'
                ? { view: 'explore' }
                : next === 'my-errands'
                  ? { view: 'my-errands' }
                  : { view: 'requests' },
            )
          }}
        />
        <RelayButton
          variant="secondary"
          size="map-pill"
          className="glass-pill glass-control profile-chip"
          aria-label="Profile"
          onClick={(event) => openProfileCard(event.currentTarget)}
        >
          {userProfile?.profilePictureUrl && (
            <img className="profile-chip-avatar" src={userProfile.profilePictureUrl} alt="" />
          )}
          {userProfile?.username ?? 'Complete profile'}
        </RelayButton>
      </div>
      <div className="errand-map-controls">
        {view !== 'my-errands' && (
          <RelayButton
            variant="secondary"
            size="map-icon"
            onClick={() => setShowFilters(true)}
            aria-label="Open errand filters"
          >
            <FilterIcon />
          </RelayButton>
        )}
        <RelayButton
          variant="secondary"
          size="map-icon"
          onClick={() => void locateMe()}
          aria-label="Center map"
        >
          <LocationIcon />
        </RelayButton>
        <RelayButton
          variant="secondary"
          size="map-icon"
          onClick={() => map?.zoomIn()}
          aria-label="Zoom in"
        >
          <PlusIcon />
        </RelayButton>
        <RelayButton
          variant="secondary"
          size="map-icon"
          onClick={() => map?.zoomOut()}
          aria-label="Zoom out"
        >
          −
        </RelayButton>
      </div>
      <div className="errand-bottom-controls map-bottom-menu">
        <RelayButton
          variant="secondary"
          size="map-action"
          className="updates-action"
          aria-label="Updates"
        >
          <span className="relay-button-icon-badge">
            <BellIcon className="errand-control-icon" />
            {notificationCount > 0 && (
              <span className="relay-button-notification-dot" aria-hidden="true" />
            )}
          </span>
          <span className="errand-control-label">Updates</span>
        </RelayButton>
        <Spacer />
        <RelayButton
          variant="primary"
          size="map-action"
          className="new-request-action"
          onClick={(event) => {
            const { top, left, right, bottom } = event.currentTarget.getBoundingClientRect()
            setCreateAnchor({ top, left, right, bottom })
            openErrandView?.({ view: 'create' })
          }}
        >
          <ClipboardPlusIcon className="errand-control-icon" />
          <span className="errand-control-label">New request</span>
        </RelayButton>
      </div>
      {selectedErrand && (
        <BubblePopover
          anchor={selectedErrandAnchor}
          maxWidth={405}
          className="errand-detail-popover"
        >
          <ErrandDetailCard
            errand={selectedErrand}
            role={role}
            onClose={() => {
              setSelectedErrandId(undefined)
              setSelectedErrandAnchor(undefined)
            }}
            onAction={(action) => updateErrand(action, selectedErrand.id)}
          />
        </BubblePopover>
      )}
      {createCard}
      {!selectedErrand && view === 'requests' && visibleErrands[0] && (
        <button
          className="my-request-card"
          type="button"
          onClick={() => setSelectedErrandId(visibleErrands[0].id)}
        >
          <span className="request-card-label">
            My request{' '}
            <StatusBadge tone={statusTone(visibleErrands[0].status)}>
              {STATUS_LABELS[visibleErrands[0].status]}
            </StatusBadge>
          </span>
          <strong>{visibleErrands[0].name}</strong>
          <small>
            {formatRoute(visibleErrands[0].pickupLocation)} →{' '}
            {formatRoute(visibleErrands[0].targetLocation)}
          </small>
          <em>
            {visibleErrands[0].creditAmount} cr reserved · Due{' '}
            {formatDeadline(visibleErrands[0].expiresAt)}
          </em>
        </button>
      )}
      {showFilters && (
        <ErrandFilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </main>
  )
}

function distance(errand: Errand, location: { lat: number; lng: number }) {
  const lat = errand.pickupLocation.lat - location.lat
  const lng = errand.pickupLocation.lng - location.lng
  return lat * lat + lng * lng
}
