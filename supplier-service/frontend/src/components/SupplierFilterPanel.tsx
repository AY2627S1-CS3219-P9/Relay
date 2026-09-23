import { ServiceType } from '@relay/contracts'
import { GlassCard, IconButton } from '@relay/ui'

export type SupplierFilters = {
  status: 'all' | 'operational' | 'not-operational'
  serviceTypes: ServiceType[]
}
const serviceOptions: Array<{ value: ServiceType; label: string }> = [
  { value: ServiceType.Food, label: 'Food' },
  { value: ServiceType.Drink, label: 'Drink' },
  { value: ServiceType.Shopping, label: 'Shopping' },
  { value: ServiceType.Printing, label: 'Printing' },
  { value: ServiceType.Parcel, label: 'Parcel' },
]

export function SupplierFilterPanel({
  filters,
  sort,
  onChange,
  onSortChange,
  onClose,
}: {
  filters: SupplierFilters
  sort: 'operational' | 'service-type'
  onChange: (filters: SupplierFilters) => void
  onSortChange: (sort: 'operational' | 'service-type') => void
  onClose: () => void
}) {
  function toggleServiceType(serviceType: ServiceType) {
    const serviceTypes = filters.serviceTypes.includes(serviceType)
      ? filters.serviceTypes.filter((value) => value !== serviceType)
      : [...filters.serviceTypes, serviceType]
    onChange({ ...filters, serviceTypes })
  }
  return (
    <GlassCard as="aside" className="supplier-filter-panel" aria-label="Supplier filters">
      <div className="filter-panel-header">
        <div>
          <span className="supplier-kicker">Explore</span>
          <h2>Filter suppliers</h2>
        </div>
        <IconButton scale={1.5} className="icon-button" label="Close filters" onClick={onClose}>
          ×
        </IconButton>
      </div>
      <label className="filter-label">
        Operational status
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as SupplierFilters['status'] })
          }
        >
          <option value="all">All suppliers</option>
          <option value="operational">Operational</option>
          <option value="not-operational">Not operational</option>
        </select>
      </label>
      <fieldset>
        <legend>Service types</legend>
        {serviceOptions.map((option) => (
          <label className="filter-check" key={option.value}>
            <input
              type="checkbox"
              checked={filters.serviceTypes.includes(option.value)}
              onChange={() => toggleServiceType(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <label className="filter-label">
        Sort markers by
        <select value={sort} onChange={(event) => onSortChange(event.target.value as typeof sort)}>
          <option value="operational">Operational status</option>
          <option value="service-type">Service type</option>
        </select>
      </label>
    </GlassCard>
  )
}
