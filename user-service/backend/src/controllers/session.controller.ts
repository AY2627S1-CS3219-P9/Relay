import type { NextFunction, Request, Response } from 'express'
import type {
  RegisterRequest,
  ResendVerificationRequest,
  SubmitOtpAndLoginRequest,
  LoginRequest,
  ChangePasswordRequest,
} from '@relay/contracts'
import { getEnv } from '../config/env.js'
import { readSessionCookie, requireSession } from '../middleware/session.middleware.js'
import { SessionService } from '../services/session.service.js'

export class SessionController {
  constructor(private readonly service: SessionService) {}

  register = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      const data = await this.service.register(req.body as RegisterRequest)
      res.status(201).json({ ok: true, data })
    })

  resendVerification = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      await this.service.resendVerification(req.body as ResendVerificationRequest)
      res.status(204).send()
    })

  confirmAndLogin = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      const result = await this.service.submitOtpAndLogin(req.body as SubmitOtpAndLoginRequest)
      this.setCookie(res, result.cookie)
      res.status(200).json({ ok: true, data: result.session })
    })

  login = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      const result = await this.service.login(req.body as LoginRequest)
      this.setCookie(res, result.cookie)
      res.status(200).json({ ok: true, data: result.session })
    })

  getSession = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      const session = requireSession(req)
      const data = await this.service.getSession(session)
      res.status(200).json({ ok: true, data })
    })

  validateInternalSession = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      const session = requireSession(req)
      const data = await this.service.getSession(session)
      res.status(200).json({ ok: true, data })
    })

  changePassword = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      await this.service.changePassword(requireSession(req), req.body as ChangePasswordRequest)
      res.status(204).send()
    })

  logout = async (req: Request, res: Response, next: NextFunction) =>
    this.run(res, next, async () => {
      const cookie = readSessionCookie(req)
      if (cookie) await this.service.revoke(cookie)
      res.clearCookie(getEnv().sessionCookieName, { path: '/' })
      res.status(204).send()
    })

  private setCookie(res: Response, value: string): void {
    const env = getEnv()
    res.setHeader(
      'Set-Cookie',
      `${env.sessionCookieName}=${value}; Path=/; HttpOnly; SameSite=Lax${env.sessionCookieSecure ? '; Secure' : ''}; Max-Age=${env.sessionTtlSeconds}`,
    )
  }

  private async run(res: Response, next: NextFunction, action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      next(error)
    }
  }
}
