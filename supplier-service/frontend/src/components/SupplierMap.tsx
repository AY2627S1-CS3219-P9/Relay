import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Supplier } from '@relay/contracts'

export type MapPoint = { lat: number; lng: number }

const supplierIcon = L.divIcon({
  className: 'relay-leaflet-icon',
  html: '<span class="supplier-marker"><b>•</b></span>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

function MapCenterController({ center }: { center: MapPoint }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}

function MapSizeController() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const invalidateSize = () => map.invalidateSize({ pan: false })
    const observer = new ResizeObserver(invalidateSize)

    observer.observe(container)
    invalidateSize()

    return () => observer.disconnect()
  }, [map])

  return null
}

function MapReadyController({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()

  useEffect(() => {
    onReady(map)
  }, [map, onReady])

  return null
}

export function SupplierMap({
  center,
  suppliers,
  userLocation,
  onSelect,
  onMapReady,
}: {
  center: MapPoint
  suppliers: Supplier[]
  userLocation?: MapPoint
  onSelect: (supplier: Supplier) => void
  onMapReady: (map: L.Map) => void
}) {
  return (
    <MapContainer className="relay-map" center={center} zoom={16} zoomControl={false}>
      <MapCenterController center={center} />
      <MapSizeController />
      <MapReadyController onReady={onMapReady} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={8}
          pathOptions={{ color: '#fff', fillColor: '#007aff', fillOpacity: 1, weight: 3 }}
        />
      )}
      {suppliers.map((supplier) => (
        <Marker
          key={supplier.id}
          position={[supplier.location.lat, supplier.location.lng]}
          icon={supplierIcon}
          eventHandlers={{ click: () => onSelect(supplier) }}
        />
      ))}
    </MapContainer>
  )
}
