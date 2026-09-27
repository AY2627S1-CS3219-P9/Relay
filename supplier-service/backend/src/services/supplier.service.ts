import type { Supplier } from '@relay/contracts/supplier'
import { SupplierRepository } from '../repositories/supplier.repository'

export class SupplierService {
  constructor(private readonly repository: SupplierRepository) {}

  async getAllSuppliers(): Promise<Supplier[]> {
    return await this.repository.findAll()
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    return await this.repository.findById(id)
  }

  async createSupplier(data: {
    name: string
    location: Supplier['location']
    isOperational: boolean
    operatingHours: Supplier['operatingHours']
    serviceTypes: Supplier['serviceTypes']
  }): Promise<Supplier> {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new Error('Name is required')
    }

    if (!data.location) {
      throw new Error('Location is required')
    }

    if (typeof data.isOperational !== 'boolean') {
      throw new Error('isOperational is required')
    }

    if (!data.operatingHours) {
      throw new Error('OperatingHours is required')
    }

    if (!Array.isArray(data.serviceTypes) || data.serviceTypes.length === 0) {
      throw new Error('serviceTypes is required')
    }

    return await this.repository.create({
      name: data.name,
      location: JSON.stringify(data.location),
      isOperational: data.isOperational,
      operatingHours: JSON.stringify(data.operatingHours),
      serviceTypes: data.serviceTypes,
    })
  }

  async updateSupplier(id: string, data: {
    name?: string
    location?: Supplier['location']
    isOperational?: boolean
    operatingHours?: Supplier['operatingHours']
    serviceTypes?: Supplier['serviceTypes']
  }): Promise<Supplier> {
    // Check if supplier exists first
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error('Supplier not found')
    }

    return await this.repository.update(id, {
      name: data.name,
      location: data.location !== undefined ? JSON.stringify(data.location) : undefined,
      isOperational: data.isOperational,
      operatingHours: data.operatingHours !== undefined ? JSON.stringify(data.operatingHours) : undefined,
      serviceTypes: data.serviceTypes,
    })
  }

  async deleteSupplier(id: string): Promise<void> {
    const exists = await this.repository.findById(id)
    if (!exists) {
      throw new Error('Supplier not found')
    }

    await this.repository.delete(id)
  }
}
