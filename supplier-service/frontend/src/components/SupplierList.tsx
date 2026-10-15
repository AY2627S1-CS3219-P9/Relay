import type { ServiceType, Supplier } from '@relay/contracts'
import { GlassCard, IconButton, StatusBadge } from '@relay/ui'
import type { CSSProperties } from 'react'

const serviceLabels: Record<ServiceType, string> = {
  0: 'Food',
  1: 'Drink',
  2: 'Shopping',
  3: 'Printing',
  4: 'Parcel',
}

export function SupplierList({
  suppliers,
  onSelect,
  onClose,
  style,
}: {
  suppliers: Supplier[]
  onSelect: (supplier: Supplier) => void
  onClose: () => void
  style?: CSSProperties
}) {
  return (
    <GlassCard as="aside" className="supplier-list" style={style} aria-label="">
      <div className="supplier-card-header">
        <div>
          <h2>Select a supplier</h2>
        </div>
        <IconButton
          scale={1.5}
          className="icon-button"
          label="Close supplier list"
          onClick={onClose}
        >
          ×
        </IconButton>
      </div>
      <div className="supplier-list-items">
        {suppliers.map((supplier) => (
          <button
            className="supplier-list-item"
            key={supplier.id}
            type="button"
            onClick={() => onSelect(supplier)}
          >
            <span className="supplier-list-item-copy">
              <strong>{supplier.name}</strong>
              <span className="supplier-list-item-meta">
                <StatusBadge tone={supplier.isOperational ? 'success' : 'danger'}>
                  {supplier.isOperational ? 'Operational' : 'Not operational'}
                </StatusBadge>
              </span>
            </span>
            <span className="supplier-list-item-services">
              {supplier.serviceTypes.map((type) => serviceLabels[type]).join(' · ')}
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
