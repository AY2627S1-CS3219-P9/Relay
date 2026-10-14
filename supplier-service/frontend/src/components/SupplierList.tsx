import type { ServiceType, Supplier } from '@relay/contracts'
import { RelayFormSurface, RelayList, RelayListItem, StatusBadge } from '@relay/ui'
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
    <RelayFormSurface as="aside" className="supplier-list" style={style} title="Select a supplier" onClose={onClose}>
      <RelayList className="supplier-list-items">
        {suppliers.map((supplier) => (
          <RelayListItem
            className="supplier-list-item"
            key={supplier.id}
            onClick={() => onSelect(supplier)}
            title={supplier.name}
            subtitle={supplier.serviceTypes.map((type) => serviceLabels[type]).join(' · ')}
            trailing={
              <span className="supplier-list-item-meta">
                <StatusBadge tone={supplier.isOperational ? 'success' : 'danger'}>
                  {supplier.isOperational ? 'Operational' : 'Not operational'}
                </StatusBadge>
              </span>
            }
          />
        ))}
      </RelayList>
    </RelayFormSurface>
  )
}
