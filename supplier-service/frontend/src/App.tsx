import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { ProfileAnchor, RemoteAppProps } from '@relay/contracts'
import { ServiceType } from '@relay/contracts'
import type { Supplier, SupplierApi } from '@relay/contracts'
import { FilterIcon, LocationIcon, RelayButton, SlidingSegmentedControl } from '@relay/ui'
import { SupplierDetailCard } from './components/SupplierDetailCard'
import { SupplierAdminPanel } from './components/SupplierAdminPanel'
import { SupplierFilterPanel, type SupplierFilters } from './components/SupplierFilterPanel'
import { SupplierMap, type MapPoint } from './components/SupplierMap'
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
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SupplierFilters>({
    status: 'all',
    serviceTypes: Object.values(ServiceType),
  })
  const [activeMode, setActiveMode] = useState<'explore' | 'requests'>('explore')
  const [errorMessage, setErrorMessage] = useState('')
  const [map, setMap] = useState<LeafletMap>()
  const [adminMode, setAdminMode] = useState<'add' | 'edit' | undefined>()
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

  // Debounce filter changes to reduce API calls
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)
      return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
  }

  const debouncedFilters = useDebounce(filters, 300)

  useEffect(() => {
    void activeApi
      .getSuppliers({ status: debouncedFilters.status, serviceTypes: debouncedFilters.serviceTypes })
      .then(({ suppliers: loadedSuppliers }) => {
        setSuppliers(loadedSuppliers)
        setErrorMessage('')
      })
      .catch((error: Error) => {
        setErrorMessage(error.message)
      })
  }, [activeApi, authVersion, debouncedFilters])

  useEffect(() => {
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
  }, [])

  return (
    <main className="supplier-app">
      <SupplierMap
        center={center}
        suppliers={suppliers}
        userLocation={userLocation}
        onSelect={setSelectedSupplier}
        onMapReady={handleMapReady}
      />
      <div className="supplier-top-controls map-top-menu">
        <RelayButton
          variant="secondary"
          scale={1.25}
          className="glass-pill glass-control mock-control"
          aria-label="Credits"
        >
          ⚡ 0 cr
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
          scale={1.25}
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
          scale={1.25}
          className="map-control-button filter-map-control"
          onClick={() => setShowFilters(true)}
          aria-label="Open supplier filters"
        >
          <FilterIcon className="filter-icon" />
        </RelayButton>
        <RelayButton
          variant="secondary"
          scale={1.25}
          className="map-control-button"
          aria-label="Center map"
          onClick={() => map?.setView(userLocation ?? center)}
        >
          <LocationIcon className="location-icon" />
        </RelayButton>
        <RelayButton
          variant="secondary"
          scale={1.25}
          className="map-control-button"
          aria-label="Zoom in"
          onClick={() => map?.zoomIn()}
        >
          +
        </RelayButton>
        <RelayButton
          variant="secondary"
          scale={1.25}
          className="map-control-button"
          aria-label="Zoom out"
          onClick={() => map?.zoomOut()}
        >
          −
        </RelayButton>
      </div>
      <div className="supplier-bottom-controls map-bottom-menu">
        <RelayButton variant="secondary" scale={1.5} className="updates-action glass-pill">
          ♟ Updates <b>1</b>
        </RelayButton>
        <RelayButton variant="primary" scale={1.5} className="new-request-action glass-btn-primary">
          ＋ New request
        </RelayButton>
      </div>
      {showFilters && (
        <SupplierFilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
      {selectedSupplier && (
        <SupplierDetailCard
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(undefined)}
        />
      )}
      {isAdmin && (
        <div className="supplier-admin-toolbar">
          <RelayButton variant="primary" onClick={() => setAdminMode('add')}>
            Add supplier
          </RelayButton>
          {selectedSupplier && (
            <RelayButton variant="secondary" onClick={() => setAdminMode('edit')}>
              Edit selected
            </RelayButton>
          )}
        </div>
      )}
      {isAdmin && adminMode && (
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
          onClose={() => setAdminMode(undefined)}
        />
      )}
      {errorMessage && (
        <div className="supplier-error" role="alert">
          {errorMessage}
        </div>
      )}
    </main>
  )
}
