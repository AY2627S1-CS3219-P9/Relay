import '@relay/ui/styles.css'
import '@relay/ui/styles/map.css'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { useEffect, useMemo, useState } from 'react'
import type { RemoteAppProps } from '@relay/contracts'
import type { ServiceType, Supplier, SupplierApi } from '@relay/contracts'
import { SupplierDetailCard } from './components/SupplierDetailCard'
import { SupplierFilterPanel, type SupplierFilters } from './components/SupplierFilterPanel'
import { SupplierMap, type MapPoint } from './components/SupplierMap'
import { mockSessionId, mockSupplierApi } from './mockSupplierApi/mockSupplierApi'

const NUS_CENTER: MapPoint = { lat: 1.2966, lng: 103.7764 }

export default function App({
  onNavigate,
  api = mockSupplierApi,
}: RemoteAppProps & { api?: SupplierApi }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [center, setCenter] = useState<MapPoint>(NUS_CENTER)
  const [userLocation, setUserLocation] = useState<MapPoint>()
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier>()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SupplierFilters>({ status: 'all', serviceTypes: [] })
  const [sort, setSort] = useState<'operational' | 'service-type'>('operational')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void api
      .getSuppliers(mockSessionId)
      .then(setSuppliers)
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
        left.serviceTypes[0].localeCompare(right.serviceTypes[0]) ||
        left.name.localeCompare(right.name)
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
      />
      <div className="supplier-top-controls map-top-menu">
        <button type="button" className="glass-pill mock-control" aria-label="Credits">
          ⚡ 0 cr
        </button>
        <div className="seg-control mock-control-group">
          <button type="button" className="seg-option active">
            Explore
          </button>
          <button type="button" className="seg-option">
            My Requests
          </button>
        </div>
        <button type="button" className="glass-pill profile-chip mock-control" aria-label="Profile">
          ◉ Alex
        </button>
      </div>
      <button
        type="button"
        className="filter-action glass-btn"
        onClick={() => setShowFilters(true)}
        aria-label="Open supplier filters"
      >
        ☷ <span>Filter</span>
      </button>
      <div className="map-stub-controls">
        <button type="button" className="map-control-button" aria-label="Center map">
          ⌖
        </button>
        <button type="button" className="map-control-button" aria-label="Zoom in">
          +
        </button>
        <button type="button" className="map-control-button" aria-label="Zoom out">
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
      <button type="button" className="return-account-button" onClick={() => onNavigate?.('user')}>
        Return to account
      </button>
    </main>
  )
}
