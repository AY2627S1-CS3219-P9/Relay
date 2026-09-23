import type { NextFunction, Request, Response } from 'express'
import { requireAuthenticatedUser } from '../middleware/cognito-auth.middleware.js'
import { UserService } from '../services/user.service.js'

export class UserController {
  constructor(private readonly userService: UserService) {}

  getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      const profile = await this.userService.getUser(user)
      res.status(200).json(profile)
    } catch (error) {
      next(error)
    }
  }

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      const profile = await this.userService.updateUser(user, req.body)
      res.status(200).json(profile)
    } catch (error) {
      next(error)
    }
  }

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      await this.userService.deleteUser(user, req.body?.confirmation)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
