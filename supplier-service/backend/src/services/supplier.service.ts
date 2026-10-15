import {
  SupplierErrors,
  type Supplier,
  type GetSuppliersFilterParams,
} from '@relay/contracts/supplier'
import { SupplierRepository } from '../repositories/supplier.repository'


export class SupplierService {
  constructor(private readonly repository: SupplierRepository) {}

  async getAllSuppliers(filters?: GetSuppliersFilterParams): Promise<Supplier[]> {
    return await this.repository.findAll(filters)
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
    try {
      return await this.repository.create({
        name: data.name,
        location: data.location,
        isOperational: data.isOperational,
        operatingHours: data.operatingHours,
        serviceTypes: data.serviceTypes,
      })
    } catch (error: any) {
      if (error?.message === SupplierErrors.DUPLICATE_SUPPLIER) {
        throw new Error(SupplierErrors.DUPLICATE_SUPPLIER)
      }
      throw new Error(SupplierErrors.INTERNAL_ERROR)
    }
  }

  async updateSupplier(
    id: string,
    data: {
      name?: string
      location?: Supplier['location']
      isOperational?: boolean
      operatingHours?: Supplier['operatingHours']
      serviceTypes?: Supplier['serviceTypes']
    },
  ): Promise<Supplier> {
    // Check if supplier exists first
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error('Supplier not found')
    }

    return await this.repository.update(id, {
      name: data.name,
      location: data.location,
      isOperational: data.isOperational,
      operatingHours: data.operatingHours,
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
