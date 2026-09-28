import type { NextFunction, Request, Response } from 'express'
import { SupplierErrors } from '@relay/contracts/supplier'
import type { ApiResult, ValidateSessionResponse } from '@relay/contracts/user'
import { SupplierService } from '../services/supplier.service'

const USER_API_URL = process.env.USER_API_URL || 'http://user-api:3000'
const USER_API_TIMEOUT = parseInt(process.env.USER_API_TIMEOUT || '5000', 10)
const USER_SERVICE_INTERNAL_TOKEN = process.env.USER_SERVICE_INTERNAL_TOKEN || 'local-internal-user-service-token'

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
        res.status(401).json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      const suppliers = await this.service.getAllSuppliers()
      res.json({ suppliers: suppliers })
    } catch (error) {
      next(error)
    }
  }

  getSupplierById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res.status(401).json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
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
        res.status(401).json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
        return
      }

      if (authResult.role !== 'admin') {
        res.status(403).json({ code: SupplierErrors.FORBIDDEN, message: 'Admin access required' })
        return
      }

      const { name, location, isOperational, operatingHours, serviceTypes } = req.body

      if (!name || typeof name !== 'string') {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'Name is required' })
        return
      }
      if (!location || typeof location !== 'object') {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'Location is required' })
        return
      }
      if (typeof isOperational !== 'boolean') {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'isOperational is required' })
        return
      }
      if (!operatingHours || typeof operatingHours !== 'object') {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'OperatingHours is required' })
        return
      }
      if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
        res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'serviceTypes is required' })
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
    } catch (error) {
      next(error)
    }
  }

  updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await checkAuth(req.header('cookie') ?? '')
      if (!authResult) {
        res.status(401).json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
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
        res.status(401).json({ code: SupplierErrors.UNAUTHORIZED, message: 'Authentication required' })
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
