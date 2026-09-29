import type { NextFunction, Request, Response } from 'express'
import { requireAuthenticatedUser } from '../middleware/cognito-auth.middleware.js'
import { requireSession } from '../middleware/session.middleware.js'
import { UserService } from '../services/user.service.js'
import { SessionRepository } from '../repositories/session.repository.js'

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly sessions: SessionRepository,
  ) {}

  checkAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      res.status(200).json({ success: true, data: { role: user.role } })
    } catch (error) {
      next(error)
    }
  }

  getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      const profile = await this.userService.getUser(user)
      res.status(200).json({ ok: true, data: profile })
    } catch (error) {
      next(error)
    }
  }

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      const profile = await this.userService.updateUser(user, req.body)
      res.status(200).json({ ok: true, data: profile })
    } catch (error) {
      next(error)
    }
  }

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requireAuthenticatedUser(req)
      await this.userService.deleteUser(
        user,
        req.body?.confirmation,
        requireSession(req).cognitoAccessToken,
      )
      await this.sessions.revokeByCognitoSub(user.sub)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
