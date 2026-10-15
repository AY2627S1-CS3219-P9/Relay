import { useEffect, useLayoutEffect } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { MapViewport, UserLocation } from '@relay/contracts'
import type { DemoErrand } from '../types'

export type MapPoint = { lat: number; lng: number }

const markerColors: Record<DemoErrand['status'], string> = {
  OPEN: '#007aff',
  ACCEPTED: '#ff9500',
  PICKED_UP: '#ff9500',
  DELIVERED: '#34c759',
  CANCELLED: '#ff3b30',
  EXPIRED: '#8e8e93',
  CONFIRMED: '#34c759',
}

function markerIcon(errand: DemoErrand, selected: boolean) {
  const color = markerColors[errand.status]
  return L.divIcon({
    className: 'relay-leaflet-icon errand-leaflet-icon',
    html: `<span class="errand-marker${selected ? ' errand-marker-selected' : ''}" style="--marker:${color}"><b>!</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  })
}

function MapCenterController({ center, zoom, active }: { center: MapPoint; zoom: number; active: boolean }) {
  const map = useMap()
  useLayoutEffect(() => {
    if (!active) return
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize({ pan: false, animate: false })
      map.setView(center, zoom, { animate: false })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [active, center, map, zoom])
  useEffect(() => {
    if (!active) return
    const currentCenter = map.getCenter()
    const centerChanged = Math.abs(currentCenter.lat - center.lat) > 0.000001 || Math.abs(currentCenter.lng - center.lng) > 0.000001
    const zoomChanged = map.getZoom() !== zoom
    if (centerChanged || zoomChanged) map.setView(center, zoom, { animate: false })
  }, [active, center, map, zoom])
  return null
}

function MapSizeController() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const invalidate = () => map.invalidateSize({ pan: false })
    const observer = new ResizeObserver(invalidate)
    observer.observe(container)
    invalidate()
    return () => observer.disconnect()
  }, [map])
  return null
}

function MapReadyController({ onReady }: { onReady?: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => { onReady?.(map) }, [map, onReady])
  return null
}

function ViewportController({ onChange }: { onChange?: (viewport: MapViewport) => void }) {
  const map = useMap()
  const reportViewport = () => {
    const center = map.getCenter()
    onChange?.({ center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() })
  }
  useEffect(() => { reportViewport() }, [map, onChange])
  useMapEvents({ zoomend: reportViewport, moveend: reportViewport })
  return null
}

export function ErrandMap({
  errands,
  center,
  userLocation,
  selectedId,
  onSelect,
  onMapReady,
  zoom,
  onViewportChange,
  active,
}: {
  errands: DemoErrand[]
  center: MapPoint
  userLocation?: UserLocation
  selectedId?: string
  onSelect: (errand: DemoErrand) => void
  onMapReady?: (map: L.Map) => void
  zoom: number
  onViewportChange?: (viewport: MapViewport) => void
  active: boolean
}) {
  return (
    <MapContainer className="relay-map" center={center} zoom={zoom} zoomControl={false}>
      <MapCenterController center={center} zoom={zoom} active={active} />
      <MapSizeController />
      <MapReadyController onReady={onMapReady} />
      <ViewportController onChange={onViewportChange} />
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
      {errands.map((errand) => (
        <Marker
          key={errand.id}
          position={[errand.pickupLocation.lat, errand.pickupLocation.lng]}
          icon={markerIcon(errand, errand.id === selectedId)}
          eventHandlers={{ click: () => onSelect(errand) }}
        />
      ))}
    </MapContainer>
  )
}
