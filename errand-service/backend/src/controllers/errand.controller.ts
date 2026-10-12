import type { NextFunction, Request, Response } from 'express'
import { ErrandService } from '../services/errand.service.js'
import { requireUser } from '../middleware/session.middleware.js'
import { SupplierEventErrors } from '@relay/contracts'

export class ErrandController {
  constructor(private readonly service: ErrandService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errand = await this.service.createErrand(requireUser(req), req.body)
      res.status(201).json({ errand })
    } catch (error) {
      next(error)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errands = await this.service.getErrands(requireUser(req))
      res.json({ errands })
    } catch (error) {
      next(error)
    }
  }

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errand = await this.service.getErrand(requireUser(req), String(req.params.id))
      res.json({ errand })
    } catch (error) {
      next(error)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteErrand(requireUser(req), String(req.params.id))
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  receiveSupplierEvents = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { supplierId, name, location, operatingHours, isOperational, serviceTypes } = req.body

      if (!supplierId) {
        res.status(400).json({
          code: SupplierEventErrors.INVALID_EVENT,
          message: 'supplierId is required',
        })
        return
      }

      const result = await this.service.receiveSupplierEvents({
        supplierId,
        name,
        location,
        operatingHours,
        isOperational,
        serviceTypes,
      })

      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}
