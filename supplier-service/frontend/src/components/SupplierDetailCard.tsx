import { Day, ServiceType } from '@relay/contracts'
import { GlassCard, IconButton, StatusBadge } from '@relay/ui'
import type { Supplier } from '@relay/contracts'

const serviceLabels: Record<ServiceType, string> = {
  [ServiceType.Food]: 'Food',
  [ServiceType.Drink]: 'Drink',
  [ServiceType.Shopping]: 'Shopping',
  [ServiceType.Printing]: 'Printing',
  [ServiceType.Parcel]: 'Parcel',
}

const dayLabels: Record<Day, string> = {
  [Day.Monday]: 'Mon',
  [Day.Tuesday]: 'Tue',
  [Day.Wednesday]: 'Wed',
  [Day.Thursday]: 'Thu',
  [Day.Friday]: 'Fri',
  [Day.Saturday]: 'Sat',
  [Day.Sunday]: 'Sun',
}

export function SupplierDetailCard({
  supplier,
  onClose,
}: {
  supplier: Supplier
  onClose: () => void
}) {
  return (
    <GlassCard as="aside" className="supplier-detail-card" aria-label={`${supplier.name} details`}>
      <div className="supplier-card-header">
        <div>
          <span className="supplier-kicker">Supplier</span>
          <h2>{supplier.name}</h2>
        </div>
        <IconButton className="icon-button" label="Close supplier details" onClick={onClose}>
          ×
        </IconButton>
      </div>
      <div className="supplier-status-row">
        <StatusBadge tone={supplier.isOperational ? 'success' : 'danger'}>
          {supplier.isOperational ? 'Operational' : 'Not operational'}
        </StatusBadge>
        <span>
          {supplier.location.buildingName} · Level {supplier.location.floorNumber}
        </span>
      </div>
      <p className="supplier-hours">
        Open {supplier.operatingHours.openingTime}–{supplier.operatingHours.closingTime},{' '}
        {supplier.operatingHours.daysOfWeek.map((day) => dayLabels[day]).join(', ')}
      </p>
      <div className="service-chip-row">
        {supplier.serviceTypes.map((type) => (
          <span className="service-chip" key={type}>
            {serviceLabels[type]}
          </span>
        ))}
      </div>
      <div className="errand-placeholder">
        <span className="supplier-kicker">Available errands</span>
        <p>No errands are available for this supplier yet.</p>
      </div>
    </GlassCard>
  )
}
