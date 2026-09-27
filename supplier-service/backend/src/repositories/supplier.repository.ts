import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../db'
import type { Supplier } from '@relay/contracts/supplier'

function toSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    isOperational: row.is_operational,
    operatingHours: row.operating_hours,
    serviceTypes: row.service_types,
  }
}

export class SupplierRepository {
  async findAll(): Promise<Supplier[]> {
    const rows = await getSuppliers()
    return rows.map(toSupplier)
  }

  async findById(id: string): Promise<Supplier | null> {
    const rows = await getSupplierById(id)
    if (!rows || rows.length === 0) return null
    return toSupplier(rows[0])
  }

  async create(data: {
    name: string
    location: string
    isOperational: boolean
    operatingHours: string
    serviceTypes: number[]
  }): Promise<Supplier> {
    const row = await createSupplier(
      data.name,
      data.location,
      data.isOperational,
      data.operatingHours,
      data.serviceTypes,
    )
    return toSupplier(row)
  }

  async update(
    id: string,
    data: {
      name?: string
      location?: string
      isOperational?: boolean
      operatingHours?: string
      serviceTypes?: number[]
    },
  ): Promise<Supplier> {
    const row = await updateSupplier(
      id,
      data.name,
      data.location,
      data.isOperational,
      data.operatingHours,
      data.serviceTypes,
    )
    return toSupplier(row)
  }

  async delete(id: string): Promise<boolean> {
    return await deleteSupplier(id)
  }
}
