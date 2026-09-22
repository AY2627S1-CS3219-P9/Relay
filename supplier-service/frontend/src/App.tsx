import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { ProfileAnchor, RemoteAppProps } from '@relay/contracts'
import type { ServiceType, Supplier, SupplierApi } from '@relay/contracts'
import { SlidingSegmentedControl } from '@relay/ui'
import { SupplierDetailCard } from './components/SupplierDetailCard'
import { SupplierFilterPanel, type SupplierFilters } from './components/SupplierFilterPanel'
import { SupplierMap, type MapPoint } from './components/SupplierMap'
import { mockSupplierApi } from './mockSupplierApi/mockSupplierApi'
import { httpSupplierApi } from './supplierApi'

const NUS_CENTER: MapPoint = { lat: 1.2966, lng: 103.7764 }
const defaultSupplierApi =
  import.meta.env.VITE_SUPPLIER_API_MODE === 'mock' ? mockSupplierApi : httpSupplierApi

export default function App({
  onNavigate,
  onOpenProfile,
  api = defaultSupplierApi,
}: RemoteAppProps & { api?: SupplierApi }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [center, setCenter] = useState<MapPoint>(NUS_CENTER)
  const [userLocation, setUserLocation] = useState<MapPoint>()
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier>()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SupplierFilters>({ status: 'all', serviceTypes: [] })
  const [sort, setSort] = useState<'operational' | 'service-type'>('operational')
  const [activeMode, setActiveMode] = useState<'explore' | 'requests'>('explore')
  const [errorMessage, setErrorMessage] = useState('')
  const [map, setMap] = useState<LeafletMap>()

  const handleMapReady = useCallback((nextMap: LeafletMap) => setMap(nextMap), [])

  function returnToAccount() {
    if (onNavigate) {
      onNavigate('user')
      return
    }
    if (window.history.length > 1) window.history.back()
  }

  function openProfile(button: HTMLButtonElement) {
    if (onOpenProfile) {
      const { top, left, right, bottom, width, height } = button.getBoundingClientRect()
      const anchor: ProfileAnchor = { top, left, right, bottom, width, height }
      onOpenProfile(anchor)
      return
    }
    returnToAccount()
  }

  useEffect(() => {
    void api
      .getSuppliers()
      .then(({ suppliers: loadedSuppliers }) => setSuppliers(loadedSuppliers))
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
  }, [api])

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
        onSelect={setSelectedSupplier}
        onMapReady={handleMapReady}
      />
      <div className="supplier-top-controls map-top-menu">
        <button
          type="button"
          className="glass-pill glass-control mock-control"
          aria-label="Credits"
        >
          ⚡ 0 cr
        </button>
        <SlidingSegmentedControl
          className="mock-control-group"
          ariaLabel="Supplier view"
          options={[
            { value: 'explore', label: 'Explore' },
            { value: 'requests', label: 'My Requests' },
          ]}
          value={activeMode}
          onChange={setActiveMode}
        />
        <button
          type="button"
          className="glass-pill glass-control profile-chip mock-control"
          aria-label="Profile"
          onClick={(event) => openProfile(event.currentTarget)}
        >
          ◉ Alex
        </button>
      </div>
      <div className="map-stub-controls">
        <button
          type="button"
          className="map-control-button filter-map-control"
          onClick={() => setShowFilters(true)}
          aria-label="Open supplier filters"
        >
          ☷
        </button>
        <button
          type="button"
          className="map-control-button"
          aria-label="Center map"
          onClick={() => map?.setView(userLocation ?? center)}
        >
          ⌖
        </button>
        <button
          type="button"
          className="map-control-button"
          aria-label="Zoom in"
          onClick={() => map?.zoomIn()}
        >
          +
        </button>
        <button
          type="button"
          className="map-control-button"
          aria-label="Zoom out"
          onClick={() => map?.zoomOut()}
        >
          −
        </button>
      </div>
      <div className="supplier-bottom-controls map-bottom-menu">
        <button type="button" className="updates-action glass-pill">
          ♟ Updates <b>1</b>
        </button>
        <button type="button" className="new-request-action glass-btn-primary">
          ＋ New request
        </button>
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
        <SupplierDetailCard
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(undefined)}
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
