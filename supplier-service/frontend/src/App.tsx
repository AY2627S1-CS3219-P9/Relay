import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { ProfileAnchor, RemoteAppProps } from '@relay/contracts'
import type { ServiceType, Supplier, SupplierApi } from '@relay/contracts'
import {
  BellIcon,
  BoltIcon,
  BubblePopover,
  ClipboardPlusIcon,
  FilterIcon,
  LocationIcon,
  PencilIcon,
  PlusIcon,
  RelayButton,
  SlidingSegmentedControl,
  Spacer,
  StorePlusIcon,
  type BubbleAnchor,
} from '@relay/ui'
import { SupplierDetailCard } from './components/SupplierDetailCard'
import { SupplierAdminPanel } from './components/SupplierAdminPanel'
import { SupplierFilterPanel, type SupplierFilters } from './components/SupplierFilterPanel'
import { SupplierMap, type MapPoint } from './components/SupplierMap'
import { SupplierRowButton } from './components/SupplierRowButton'
import { mockSupplierApi } from './mockSupplierApi/mockSupplierApi'
import { createHttpSupplierApi } from './supplierApi'

const NUS_CENTER: MapPoint = { lat: 1.2966, lng: 103.7764 }
export default function App({
  navigateTo,
  openProfile,
  userProfile,
  authVersion,
  api,
}: RemoteAppProps & { api?: SupplierApi }) {
  const activeApi = useMemo(
    () =>
      api ??
      (import.meta.env.VITE_SUPPLIER_API_MODE === 'mock'
        ? mockSupplierApi
        : createHttpSupplierApi()),
    [api],
  )
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [center, setCenter] = useState<MapPoint>(NUS_CENTER)
  const [userLocation, setUserLocation] = useState<MapPoint>()
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier>()
  const [selectedSupplierAnchor, setSelectedSupplierAnchor] = useState<BubbleAnchor>()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SupplierFilters>({ status: 'all', serviceTypes: [] })
  const [sort, setSort] = useState<'operational' | 'service-type'>('operational')
  const [activeMode, setActiveMode] = useState<'explore' | 'requests'>('explore')
  const [errorMessage, setErrorMessage] = useState('')
  const [map, setMap] = useState<LeafletMap>()
  const [adminMode, setAdminMode] = useState<'add' | 'edit' | undefined>()
  const [adminAnchor, setAdminAnchor] = useState<BubbleAnchor>()
  const isAdmin = userProfile?.role === 'admin'

  const handleMapReady = useCallback((nextMap: LeafletMap) => setMap(nextMap), [])

  function returnToAccount() {
    if (navigateTo) {
      navigateTo('user')
      return
    }
    if (window.history.length > 1) window.history.back()
  }

  function openProfileCard(button: HTMLButtonElement) {
    if (openProfile) {
      const { top, left, right, bottom, width, height } = button.getBoundingClientRect()
      const anchor: ProfileAnchor = { top, left, right, bottom, width, height }
      openProfile(anchor)
      return
    }
    returnToAccount()
  }

  function openAdminPanel(mode: 'add' | 'edit', button: HTMLButtonElement) {
    const { top, left, right, bottom } = button.getBoundingClientRect()
    setAdminAnchor({ top, left, right, bottom })
    setAdminMode(mode)
  }

  function getSupplierCardStyle(anchor: BubbleAnchor): CSSProperties | undefined {
    if (window.innerWidth <= 700) return undefined
    const margin = 24
    const gap = 16
    const cardWidth = Math.min(360, window.innerWidth - margin * 2)
    const cardHeight = 300
    const canPlaceRight = anchor.right + gap + cardWidth <= window.innerWidth - margin
    const canPlaceLeft = anchor.left - gap - cardWidth >= margin
    const left = canPlaceRight
      ? anchor.right + gap
      : canPlaceLeft
        ? anchor.left - gap - cardWidth
        : Math.max(margin, (window.innerWidth - cardWidth) / 2)
    const markerCenterY = (anchor.top + anchor.bottom) / 2
    const top = Math.min(
      Math.max(margin, markerCenterY - cardHeight / 2),
      window.innerHeight - cardHeight - margin,
    )

    return { left, top, width: cardWidth, transform: 'none' }
  }

  useEffect(() => {
    void activeApi
      .getSuppliers()
      .then(({ suppliers: loadedSuppliers }) => {
        setSuppliers(loadedSuppliers)
        setErrorMessage('')
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load suppliers.')
      })
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude }
        setUserLocation(location)
        setCenter(location)
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    )
  }, [activeApi, authVersion])

  const visibleSuppliers = useMemo(() => {
    const filtered = suppliers.filter((supplier) => {
      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'operational' && supplier.isOperational) ||
        (filters.status === 'not-operational' && !supplier.isOperational)
      const matchesServiceTypes =
        filters.serviceTypes.length === 0 ||
        filters.serviceTypes.some((serviceType: ServiceType) =>
          supplier.serviceTypes.includes(serviceType),
        )
      return matchesStatus && matchesServiceTypes
    })
    return [...filtered].sort((left, right) => {
      if (sort === 'operational' && left.isOperational !== right.isOperational)
        return left.isOperational ? -1 : 1
      return (
        (left.serviceTypes[0] ?? Number.MAX_SAFE_INTEGER) -
          (right.serviceTypes[0] ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name)
      )
    })
  }, [filters, sort, suppliers])

  return (
    <main className="supplier-app">
      <SupplierMap
        center={center}
        suppliers={visibleSuppliers}
        userLocation={userLocation}
        onSelect={(supplier, anchor) => {
          setSelectedSupplier(supplier)
          setSelectedSupplierAnchor(anchor)
        }}
        onMapReady={handleMapReady}
      />
      <div className="supplier-top-controls map-top-menu">
        <RelayButton
          variant="secondary"
          scale={1}
          className="glass-pill glass-control mock-control"
          aria-label="Credits"
        >
          <BoltIcon className="supplier-control-icon" />
          <span>0 cr</span>
        </RelayButton>
        <div className="supplier-segment-control">
          <SlidingSegmentedControl
            className="mock-control-group"
            scale={1}
            ariaLabel="Supplier view"
            options={[
              { value: 'explore', label: 'Explore' },
              { value: 'requests', label: 'My Requests' },
            ]}
            value={activeMode}
            onChange={setActiveMode}
          />
        </div>
        <RelayButton
          variant="secondary"
          scale={1}
          className="glass-pill glass-control profile-chip mock-control"
          aria-label="Profile"
          onClick={(event) => openProfileCard(event.currentTarget)}
        >
          {userProfile?.profilePictureUrl && (
            <img className="profile-chip-avatar" src={userProfile.profilePictureUrl} alt="" />
          )}
          {userProfile?.username ?? 'Complete profile'}
        </RelayButton>
      </div>
      <div className="map-stub-controls">
        <RelayButton
          variant="secondary"
          scale={1}
          className="map-control-button filter-map-control"
          onClick={() => setShowFilters(true)}
          aria-label="Open supplier filters"
        >
          <FilterIcon className="filter-icon" />
        </RelayButton>
        <RelayButton
          variant="secondary"
          scale={1}
          className="map-control-button"
          aria-label="Center map"
          onClick={() => map?.setView(userLocation ?? center)}
        >
          <LocationIcon className="location-icon" />
        </RelayButton>
        <RelayButton
          variant="secondary"
          scale={1}
          className="map-control-button"
          aria-label="Zoom in"
          onClick={() => map?.zoomIn()}
        >
          <PlusIcon className="location-icon" />
        </RelayButton>
        <RelayButton
          variant="secondary"
          scale={1}
          className="map-control-button"
          aria-label="Zoom out"
          onClick={() => map?.zoomOut()}
        >
          −
        </RelayButton>
      </div>
      <div className="supplier-bottom-controls map-bottom-menu">
        <SupplierRowButton className="updates-action">
          <BellIcon className="supplier-control-icon" />
          <span className="supplier-control-label">Updates</span>
        </SupplierRowButton>
        <Spacer />
        {isAdmin && (
          <>
            {selectedSupplier && (
              <SupplierRowButton
                variant="secondary"
                className="supplier-admin-action"
                onClick={(event) => openAdminPanel('edit', event.currentTarget)}
                aria-label="Edit selected supplier"
                title="Edit selected supplier"
              >
                <span className="supplier-action-icon" aria-hidden="true">
                  <PencilIcon />
                </span>
                <span className="supplier-action-label">Edit selected</span>
              </SupplierRowButton>
            )}
            <SupplierRowButton
              variant="primary"
              className="supplier-admin-action"
              onClick={(event) => openAdminPanel('add', event.currentTarget)}
              aria-label="Add supplier"
              title="Add supplier"
            >
              <span className="supplier-action-icon" aria-hidden="true">
                <StorePlusIcon />
              </span>
              <span className="supplier-action-label">Add supplier</span>
            </SupplierRowButton>
          </>
        )}
        <SupplierRowButton variant="primary" className="new-request-action">
          <ClipboardPlusIcon className="supplier-control-icon" />
          <span className="supplier-control-label">New request</span>
        </SupplierRowButton>
      </div>
      {showFilters && (
        <SupplierFilterPanel
          filters={filters}
          sort={sort}
          onChange={setFilters}
          onSortChange={setSort}
          onClose={() => setShowFilters(false)}
        />
      )}
      {selectedSupplier && (
        <BubblePopover anchor={selectedSupplierAnchor}>
          <SupplierDetailCard
            supplier={selectedSupplier}
            style={
              selectedSupplierAnchor ? getSupplierCardStyle(selectedSupplierAnchor) : undefined
            }
            onClose={() => {
              setSelectedSupplier(undefined)
              setSelectedSupplierAnchor(undefined)
            }}
          />
        </BubblePopover>
      )}
      {isAdmin && adminMode && (
        <BubblePopover anchor={adminAnchor}>
          <SupplierAdminPanel
            api={activeApi}
            supplier={adminMode === 'edit' ? selectedSupplier : undefined}
            onSaved={(supplier) => {
              setSuppliers((current) => {
                const index = current.findIndex((item) => item.id === supplier.id)
                if (index < 0) return [...current, supplier]
                const next = [...current]
                next[index] = supplier
                return next
              })
              setSelectedSupplier(supplier)
            }}
            onDeleted={(id) => {
              setSuppliers((current) => current.filter((supplier) => supplier.id !== id))
              setSelectedSupplier(undefined)
            }}
            onClose={() => {
              setAdminMode(undefined)
              setAdminAnchor(undefined)
            }}
          />
        </BubblePopover>
      )}
      {errorMessage && (
        <div className="supplier-error" role="alert">
          {errorMessage}
        </div>
      )}
    </main>
  )
}
