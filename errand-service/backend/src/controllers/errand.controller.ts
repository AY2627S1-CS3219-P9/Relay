import type { NextFunction, Request, Response } from 'express'
import { ErrandErrors } from '@relay/contracts'
import { ErrandService } from '../services/errand.service.js'
import { requireUser } from '../middleware/session.middleware.js'
import { validateSupplierErrandView } from '../validators/errand.validator.js'

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
      const scope = req.query.scope
      if (scope !== undefined && scope !== 'mine' && scope !== 'visible') {
        res.status(400).json({
          code: ErrandErrors.INVALID_ERRAND,
          message: 'Invalid errand list scope.',
          fieldErrors: { scope: 'Scope must be mine or visible.' },
        })
        return
      }
      const errands = await this.service.getErrands(requireUser(req), {
        scope: scope as 'mine' | 'visible' | undefined,
      })
      res.json({ errands })
    } catch (error) {
      next(error)
    }
  }

  supplierView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = typeof req.query.supplierId === 'string' ? req.query.supplierId : undefined
      const errands = await this.service.getSupplierErrandView(
        requireUser(req),
        validateSupplierErrandView({
          scope: req.query.scope,
          ...(supplierId !== undefined ? { supplierId } : {}),
        }),
      )
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
}
