import type { Day, ServiceType, Supplier } from '@relay/contracts'

const serviceLabels: Record<ServiceType, string> = {
  'food-and-beverage': 'Food & beverage',
  'pick-ups': 'Pick-ups',
  'product-purchasing': 'Product purchasing',
  printing: 'Printing',
}

const dayLabels: Record<Day, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export function SupplierDetailCard({
  supplier,
  onClose,
}: {
  supplier: Supplier
  onClose: () => void
}) {
  return (
    <aside className="supplier-detail-card" aria-label={`${supplier.name} details`}>
      <div className="supplier-card-header">
        <div>
          <span className="supplier-kicker">Supplier</span>
          <h2>{supplier.name}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close supplier details"
        >
          ×
        </button>
      </div>
      <div className="supplier-status-row">
        <span className={`supplier-status ${supplier.isOperational ? 'is-open' : 'is-closed'}`}>
          {supplier.isOperational ? 'Operational' : 'Not operational'}
        </span>
        <span>
          {supplier.location.buildingName} · Level {supplier.location.floorNum}
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
    </aside>
  )
}
