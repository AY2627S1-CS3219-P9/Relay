import type { NextFunction, Request, Response } from 'express'
import { CreditService } from '../services/credit.service.js'
import { authenticatedUserId, reserveCreditRequest } from '../validators/credit.validator.js'

export class CreditController {
  constructor(private readonly service: CreditService) {}

  viewCredit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = authenticatedUserId(req, res)
      res.json(await this.service.viewCredit({ userId }))
    } catch (error) {
      next(error)
    }
  }

  viewCreditHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = authenticatedUserId(req, res)
      res.json(await this.service.viewCreditHistory({ userId }))
    } catch (error) {
      next(error)
    }
  }

  reserveCredit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(await this.service.reserveCredit(reserveCreditRequest(req, res)))
    } catch (error) {
      next(error)
    }
  }
}
