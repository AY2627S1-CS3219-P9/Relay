import type { NextFunction, Request, Response } from 'express'
import { SupplierErrors } from '@relay/contracts/supplier'
import type { GetSuppliersFilterParams, ServiceType } from '@relay/contracts/supplier'
import type { ApiResult, ValidateSessionResponse } from '@relay/contracts/user'
import { SupplierService } from '../services/supplier.service'
import { validateLocation, validateOperatingHours, validateServiceTypes } from '../validators/supplier.validator'

const USER_API_URL = process.env.USER_API_URL || 'http://user-api:3000'
const USER_API_TIMEOUT = parseInt(process.env.USER_API_TIMEOUT || '5000', 10)
const USER_SERVICE_INTERNAL_TOKEN =
  process.env.USER_SERVICE_INTERNAL_TOKEN || 'local-internal-user-service-token'

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<globalThis.Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), USER_API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function checkAuth(cookieHeader: string): Promise<{ role: 'admin' | 'user' } | null> {
  if (!cookieHeader || cookieHeader.trim() === '') {
    return null
  }

  try {
    const response = await fetchWithTimeout(`${USER_API_URL}/internal/user/session/validate`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        'x-user-service-token': USER_SERVICE_INTERNAL_TOKEN,
      },
    })

    if (!response.ok) {
      console.error(`checkAuth failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data = (await response.json()) as ApiResult<ValidateSessionResponse>
    if (!data.ok) {
      return null
    }
    return { role: data.data.user.role }
  } catch (err) {
    console.error('checkAuth network error:', err)
    return null
  }
}

export class SupplierController {
  constructor(private readonly service: SupplierService) {}

  getAllSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res
          .status(401)
          .json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      const { status, serviceTypes } = req.query
      const filters: GetSuppliersFilterParams = {}

      if (status !== undefined) {
        if (status !== 'all' && status !== 'operational' && status !== 'not-operational') {
          res
            .status(400)
            .json({ code: SupplierErrors.INVALID_REQUEST, message: 'Invalid status filter' })
          return
        }
        filters.status = status as GetSuppliersFilterParams['status']
      }

      if (serviceTypes !== undefined) {
        let parsedServiceTypes: unknown
        try {
          parsedServiceTypes = JSON.parse(serviceTypes as string)
        } catch {
          parsedServiceTypes = undefined
        }
        if (
          !Array.isArray(parsedServiceTypes) ||
          !parsedServiceTypes.every((value) => typeof value === 'number')
        ) {
          res
            .status(400)
            .json({ code: SupplierErrors.INVALID_REQUEST, message: 'Invalid serviceTypes filter' })
          return
        }
        filters.serviceTypes = parsedServiceTypes as ServiceType[]
      }

      const suppliers = await this.service.getAllSuppliers(filters)
      res.json({ suppliers: suppliers })
    } catch (error) {
      next(error)
    }
  }

  getSupplierById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res
          .status(401)
          .json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      const supplier = await this.service.getSupplierById(req.params.id)
      if (!supplier) {
        res.status(404).json({ code: SupplierErrors.NOT_FOUND, message: 'Supplier not found' })
        return
      }
      res.json({ supplier: supplier })
    } catch (error) {
      next(error)
    }
  }

  createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res
          .status(401)
          .json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      if (authResult.role !== 'admin') {
        res.status(403).json({ code: SupplierErrors.FORBIDDEN, message: 'Admin access required' })
        return
      }

      const { name, location, isOperational, operatingHours, serviceTypes } = req.body

      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'Name is required' })
        return
      }
      if (typeof isOperational !== 'boolean') {
        res
          .status(400)
          .json({ code: SupplierErrors.INVALID_REQUEST, message: 'isOperational is required' })
        return
      }

      const locationError = validateLocation(location)
      if (locationError) {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: locationError })
        return
      }

      const operatingHoursError = validateOperatingHours(operatingHours)
      if (operatingHoursError) {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: operatingHoursError })
        return
      }

      const serviceTypesError = validateServiceTypes(serviceTypes)
      if (serviceTypesError) {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: serviceTypesError })
        return
      }

      const supplier = await this.service.createSupplier({
        name,
        location,
        isOperational,
        operatingHours,
        serviceTypes,
      })

      res.status(201).json({ supplier: supplier })
    } catch (error: any) {
      if (error?.message === SupplierErrors.DUPLICATE_SUPPLIER) {
        res.status(409).json({
          code: SupplierErrors.DUPLICATE_SUPPLIER,
          message: 'A supplier with this name already exists at this location',
        })
        return
      }
      res.status(500).json({
        code: SupplierErrors.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      })
    }
  }

  updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res
          .status(401)
          .json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      if (authResult.role !== 'admin') {
        res.status(403).json({ code: SupplierErrors.FORBIDDEN, message: 'Admin access required' })
        return
      }

      const { name, location, isOperational, operatingHours, serviceTypes } = req.body
      const id = req.params.id

      const supplier = await this.service.updateSupplier(id, {
        name,
        location,
        isOperational,
        operatingHours,
        serviceTypes,
      })

      res.json({ supplier: supplier })
    } catch (error) {
      next(error)
    }
  }

  deleteSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res
          .status(401)
          .json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      if (authResult.role !== 'admin') {
        res.status(403).json({ code: SupplierErrors.FORBIDDEN, message: 'Admin access required' })
        return
      }

      await this.service.deleteSupplier(req.params.id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
