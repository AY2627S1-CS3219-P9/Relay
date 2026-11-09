// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT-5.6 Luna), date: 2026-10-14
// Scope: Generated initial implementation, decomposed App.tsx into separate components
// Author review: I validated correctness and edited for style.

import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import {
  Errand,
  ErrandNotificationType,
  ErrandNotificationTypes,
  ErrandStatus,
  ProfileAnchor,
  ErrandRemoteProps,
  ServiceType,
} from '@relay/contracts'
import {
  BellIcon,
  BoltIcon,
  ButtonWithImage,
  BubblePopover,
  ClipboardPlusIcon,
  FilterIcon,
  LocationIcon,
  MapSelectionList,
  StatusBadge,
  PlusIcon,
  RelayButton,
  RelayCardAnchor,
  SlidingSegmentedControl,
  Spacer,
  UpdatesCard,
  type BubbleAnchor,
} from '@relay/ui'
import { CreateErrandCard } from './components/CreateErrandCard'
import { ErrandDetailCard } from './components/ErrandDetailCard'
import { ErrandFilterPanel, type ErrandFilters } from './components/ErrandFilterPanel'
import { ErrandMap, getErrandAnchor } from './components/ErrandMap'
import { formatRoute, STATUS_LABELS, statusTone } from './types'
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
  openCredit,
  invalidateCreditBalance,
  userProfile,
  creditBalance,
  authenticatedSubject,
  userLocation,
  requestUserLocation,
  mapViewport,
  onMapViewportChange,
  mapActive,
  presentation,
  errandApi,
  supplierApi,
}: ErrandRemoteProps) {
  const [errands, setErrands] = useState<Errand[]>([])
  const [nearbyErrandIds, setNearbyErrandIds] = useState<string[]>([])
  const [selectedErrandId, setSelectedErrandId] = useState<string>()
  const [selectedErrandAnchor, setSelectedErrandAnchor] = useState<BubbleAnchor>()
  const [showFilters, setShowFilters] = useState(false)
  const [showUpdates, setShowUpdates] = useState(false)
  const [updatesAnchor, setUpdatesAnchor] = useState<BubbleAnchor>()
  const [updates, setUpdates] = useState<Errand[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [updatesError, setUpdatesError] = useState('')
  const [location, setLocation] = useState(userLocation)
  const [map, setMap] = useState<LeafletMap>()
  const [createAnchor, setCreateAnchor] = useState<BubbleAnchor>()
  const [filters, setFilters] = useState<ErrandFilters>({
    statuses: [
      ErrandStatus.Open,
      ErrandStatus.Accepted,
      ErrandStatus.PickedUp,
      ErrandStatus.Delivered,
      ErrandStatus.Confirmed,
      ErrandStatus.Expired,
    ],
    serviceTypes: [
      ServiceType.Food,
      ServiceType.Drink,
      ServiceType.Shopping,
      ServiceType.Parcel,
      ServiceType.Printing,
    ],
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
    let filtered = errands

    // For 'my-errands' view, only show errands assigned to this user as courier
    if (view === 'my-errands') {
      filtered = filtered.filter((errand) => errand.courierSub === authenticatedSubject)
    }

    // Filter by status and service type (for explore/requests views)
    if (view !== 'my-errands') {
      filtered = filtered.filter(
        (errand) =>
          filters.statuses.includes(errand.status) &&
          filters.serviceTypes.includes(errand.supplierDetails.serviceType as ServiceType),
      )
    }

    return [...filtered].sort((left, right) => {
      if (filters.sort === 'deadline') return left.expiresAt.localeCompare(right.expiresAt)
      if (filters.sort === 'start') return left.startAt.localeCompare(right.startAt)
      if (filters.sort === 'distance' && location)
        return distance(left, location) - distance(right, location)
      return lifecycleRank[left.status] - lifecycleRank[right.status]
    })
  }, [errands, filters, location, view, authenticatedSubject])

  const nearbyErrands = visibleErrands.filter((errand) => nearbyErrandIds.includes(errand.id))

  function closeMapSelection() {
    setNearbyErrandIds([])
    setSelectedErrandId(undefined)
    setSelectedErrandAnchor(undefined)
  }

  useEffect(() => {
    closeMapSelection()
  }, [view])

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

  function openCreditCard(button: HTMLButtonElement) {
    if (!openCredit) return
    const { top, left, right, bottom, width, height } = button.getBoundingClientRect()
    openCredit({ top, left, right, bottom, width, height })
  }

  function closeUpdates() {
    setShowUpdates(false)
    setUpdatesAnchor(undefined)
  }

  function openUpdates(button: HTMLButtonElement) {
    const { top, left, right, bottom } = button.getBoundingClientRect()
    setUpdatesAnchor({ top, left, right, bottom })
    setShowUpdates(true)
    setUpdatesLoading(true)
    setUpdatesError('')
    if (!errandApi) {
      setUpdates(errands.filter((errand) => errand.requesterSub === authenticatedSubject))
      setUpdatesLoading(false)
      return
    }
    void errandApi
      .getErrands({ scope: 'mine' })
      .then(({ errands: loaded }) => setUpdates(loaded))
      .catch((error: unknown) => {
        setUpdatesError(error instanceof Error ? error.message : 'Unable to load updates.')
      })
      .finally(() => setUpdatesLoading(false))
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
              ? response.errand // Use the updated errand from the response
              : errand,
          ),
        )
        // Drop errand may result in OPEN (new errand in pool) or EXPIRED (credit release)
        if (
          response.errand.status === ErrandStatus.Expired ||
          response.errand.status === ErrandStatus.Open
        ) {
          invalidateCreditBalance?.()
        }
        // Close the errand detail window when courier drops the errand
        if (selectedErrandId === id) {
          setSelectedErrandId(undefined)
          setSelectedErrandAnchor(undefined)
        }
        // If we're viewing "my-errands" tab, switch back to "requests" since dropped errand
        // is no longer assigned to this courier
        if (view === 'my-errands') {
          openErrandView?.({ view: 'requests' })
        }
        return
      }
      const response = await actions[action](id)
      setErrands((current) =>
        current.map((errand) => (errand.id === id ? { ...errand, ...response.errand } : errand)),
      )
      if (action === 'cancel' || action === 'confirm') invalidateCreditBalance?.()
      if (action === 'accept') openErrandView?.({ view: 'my-errands' })
      return
    }
    const nextStatus: Partial<Record<typeof action, ErrandStatus>> = {
      accept: ErrandStatus.Accepted,
      pickup: ErrandStatus.PickedUp,
      deliver: ErrandStatus.Delivered,
      confirm: ErrandStatus.Confirmed,
      cancel: ErrandStatus.Cancelled,
      drop: ErrandStatus.Open,
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

  // Refetch errands from API
  const refetchErrands = useCallback(async () => {
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

  // Refetch errand details from API
  const refetchErrandDetails = useCallback(
    async (errandId: string) => {
      if (!errandApi) return
      void errandApi
        .getErrand(errandId)
        .then(({ errand }) => {
          setErrands((current) => current.map((e) => (e.id === errandId ? errand : e)))
        })
        .catch(() => undefined)
    },
    [errandApi],
  )

  // SSE notifications for other users' changes
  const handleErrandUpdate = useCallback(
    (event: {
      errandId: string
      type: ErrandNotificationType
      oldStatus?: string
      newStatus: string
    }) => {
      // Update errand status locally without refetching
      const updateStatus = (current: Errand[]) =>
        current.map((errand) =>
          errand.id === event.errandId
            ? { ...errand, status: event.newStatus as ErrandStatus }
            : errand,
        )
      setErrands(updateStatus)
      setUpdates(updateStatus)

      // Invalidate credit balance when errand status changes affect credits
      if (event.type === ErrandNotificationTypes.ERRAND_STATUS_CHANGED) {
        if (
          event.newStatus === ErrandStatus.Cancelled ||
          event.newStatus === ErrandStatus.Confirmed ||
          event.newStatus === ErrandStatus.Expired
        ) {
          invalidateCreditBalance?.()
        }
      }
    },
    [invalidateCreditBalance],
  )

  useErrandNotifications(
    authenticatedSubject,
    errands,
    handleErrandUpdate,
    refetchErrands,
    refetchErrandDetails,
  )

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
        onCreated={() => {
          invalidateCreditBalance?.()
          openErrandView?.({ view: 'requests' })
        }}
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
        groupOverlaps={view === 'requests' || view === 'my-errands'}
        onSelect={(errand, anchor, nearby) => {
          setNearbyErrandIds(nearby.length > 1 ? nearby.map((item) => item.id) : [])
          setSelectedErrandId(nearby.length === 1 ? errand.id : undefined)
          setSelectedErrandAnchor(anchor)
        }}
        onMapClick={closeMapSelection}
        onMapReady={setMap}
        zoom={mapViewport?.zoom ?? 16}
        onViewportChange={handleViewportChange}
        active={mapActive ?? true}
      />
      <div className="errand-top-controls map-top-menu" data-relay-card-exclusion="top">
        <RelayButton
          variant="secondary"
          size="map-pill"
          className="glass-pill glass-control"
          aria-label="Credits"
          onClick={(event) => openCreditCard(event.currentTarget)}
        >
          <BoltIcon className="errand-control-icon" />
          <span>{creditBalance?.availableCredit ?? '...'} cr</span>
        </RelayButton>
        <SlidingSegmentedControl
          size="map"
          cardExclusion="top"
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
        <ButtonWithImage
          variant="secondary"
          size="map-pill"
          className="glass-pill glass-control"
          aria-label="Profile"
          onClick={(event) => openProfileCard(event.currentTarget)}
          imageUrl={userProfile?.profilePictureUrl}
          fallback={userProfile?.username?.trim().charAt(0).toUpperCase() || '?'}
        >
          {userProfile?.username ?? 'Complete profile'}
        </ButtonWithImage>
      </div>
      <div className="errand-map-controls" data-relay-card-exclusion="right">
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
      <div className="errand-bottom-controls map-bottom-menu" data-relay-card-exclusion="bottom">
        <RelayButton
          variant="secondary"
          size="map-action"
          className="updates-action"
          aria-label="Updates"
          onClick={(event) => openUpdates(event.currentTarget)}
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
      {!selectedErrand && nearbyErrands.length > 0 && (
        <BubblePopover anchor={selectedErrandAnchor}>
          <MapSelectionList
            title={view === 'requests' ? 'Select a request' : 'Select an errand'}
            items={nearbyErrands}
            getTitle={(errand) => errand.name}
            getSubtitle={(errand) => formatRoute(errand.pickupLocation)}
            getTrailing={(errand) => (
              <StatusBadge tone={statusTone(errand.status)}>
                {STATUS_LABELS[errand.status]}
              </StatusBadge>
            )}
            onSelect={(errand) => {
              if (!map) return
              setSelectedErrandId(errand.id)
              setSelectedErrandAnchor(getErrandAnchor(map, errand))
              setNearbyErrandIds([])
            }}
            onClose={closeMapSelection}
          />
        </BubblePopover>
      )}
      {selectedErrand && (
        <BubblePopover
          anchor={selectedErrandAnchor}
          maxWidth={405}
          className="errand-detail-popover"
        >
          <ErrandDetailCard
            errand={selectedErrand}
            role={role}
            onClose={closeMapSelection}
            onAction={(action) => updateErrand(action, selectedErrand.id)}
          />
        </BubblePopover>
      )}
      {showUpdates && (
        <BubblePopover
          anchor={updatesAnchor}
          maxWidth={405}
          placement="above"
          className="errand-updates-popover"
        >
          <UpdatesCard
            errands={updates}
            loading={updatesLoading}
            error={updatesError}
            onClose={closeUpdates}
            onSelect={(errand) => {
              const anchor = updatesAnchor
              closeUpdates()
              setNearbyErrandIds([])
              setSelectedErrandId(errand.id)
              setSelectedErrandAnchor(anchor)
            }}
          />
        </BubblePopover>
      )}
      {createCard}
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
