import type { NextFunction, Request, Response } from 'express'
import { AdminService } from '../services/admin.service.js'

export class AdminController {
  constructor(private readonly service: AdminService) {}

  getAdmins = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ ok: true, data: await this.service.getAdmins() })
    } catch (error) { next(error) }
  }

  promote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.promote(req.body)
      res.status(204).send()
    } catch (error) { next(error) }
  }

  demote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.demote(req.body)
      res.status(204).send()
    } catch (error) { next(error) }
  }
}
