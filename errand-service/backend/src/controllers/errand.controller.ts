import type { NextFunction, Request, Response } from 'express'
import { ErrandService } from '../services/errand.service.js'
import { requireUser } from '../middleware/session.middleware.js'
import { validateCreateErrand, validateSupplierErrandView } from '../validators/errand.validator.js'
import { ErrandErrors, SupplierEventErrors } from '@relay/contracts'
import { ErrandEventStream } from '../services/errandEventStream.js'

export class ErrandController {
  constructor(
    private readonly service: ErrandService,
    private readonly eventStream?: ErrandEventStream,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateCreateErrand(req.body)
      const errand = await this.service.createErrand(requireUser(req), validated)
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

  listOpenBySupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = String(req.params.supplierId)
      const errands = await this.service.listOpenBySupplier(supplierId)
      res.json({ errands })
    } catch (error) {
      next(error)
    }
  }

  listBySupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = String(req.params.supplierId)
      const scope = req.query.scope
      if (scope !== undefined && scope !== 'open' && scope !== 'all') {
        res.status(400).json({
          code: ErrandErrors.INVALID_ERRAND,
          message: 'Invalid supplier errand scope.',
          fieldErrors: { scope: 'Scope must be open or all.' },
        })
        return
      }
      const errands =
        scope === 'open'
          ? await this.service.listOpenBySupplier(supplierId)
          : await this.service.listBySupplier(supplierId)
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

  accept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id)
      const courier = requireUser(req)
      const errand = await this.service.acceptErrand(courier, id)
      res.status(200).json({ errand })
    } catch (error) {
      next(error)
    }
  }

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id)
      const user = requireUser(req)
      const errand = await this.service.cancelErrand(user, id)
      res.status(200).json({ errand })
    } catch (error) {
      next(error)
    }
  }

  pickUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id)
      const courier = requireUser(req)
      const errand = await this.service.pickUpErrand(courier, id)
      res.status(200).json({ errand })
    } catch (error) {
      next(error)
    }
  }

  deliver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id)
      const courier = requireUser(req)
      const errand = await this.service.deliverErrand(courier, id)
      res.status(200).json({ errand })
    } catch (error) {
      next(error)
    }
  }

  confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id)
      const requester = requireUser(req)
      const errand = await this.service.confirmErrand(requester, id)
      res.status(200).json({ errand })
    } catch (error) {
      next(error)
    }
  }

  drop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errand = await this.service.dropErrand(requireUser(req), String(req.params.id))
      res.status(200).json({ errand })
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

  receiveSupplierEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { supplierId, name, location, operatingHours, isOperational, serviceTypes } = req.body

      if (!supplierId) {
        res.status(400).json({
          code: SupplierEventErrors.INVALID_EVENT,
          message: 'supplierId is required',
        })
        return
      }

      const result = await this.service.receiveSupplierEvent({
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

  streamNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireUser(req)
      const userSub = user.sub

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      // Send initial connection confirmed
      res.write(': connected\n\n')

      // Load user's errands to subscribe
      const errands = await this.service.getErrands(user)

      // Subscribe to each errand
      if (this.eventStream) {
        for (const errand of errands) {
          const isRequester = errand.requesterSub === userSub
          const role: import('../services/errandEventStream.js').ErrandEventSubscriber = isRequester
            ? 'requester'
            : 'courier'
          this.eventStream.subscribe(errand.id, userSub, res, role)
        }
      }

      // Handle client disconnect
      req.on('close', () => {
        if (this.eventStream) {
          for (const errand of errands) {
            this.eventStream.unsubscribe(errand.id, userSub)
          }
        }
        res.end()
      })
    } catch (error) {
      next(error)
    }
  }
}
