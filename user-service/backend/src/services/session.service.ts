import {
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  GetUserCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  SubmitOtpAndLoginRequest,
} from '@relay/contracts'
import type { SessionUser, UserRole } from '@relay/contracts'

type UserSession = { user: SessionUser }
import { createHash, randomBytes } from 'node:crypto'
import { getEnv } from '../config/env.js'
import { SessionRepository, type StoredSession } from '../repositories/session.repository.js'
import { UserRepository } from '../repositories/user.repository.js'
import { UserServiceError } from '../types/user.types.js'

export class SessionService {
  private readonly client: CognitoIdentityProviderClient
  private readonly env = getEnv()

  constructor(
    private readonly sessions: SessionRepository,
    private readonly profiles: UserRepository,
  ) {
    this.client = new CognitoIdentityProviderClient({
      region: this.env.awsRegion,
      endpoint: this.env.awsEndpointUrl,
    })
  }

  async register(request: RegisterRequest): Promise<{ verificationRequired: true }> {
    if (request.password !== request.passwordConfirmation) {
      throw new UserServiceError('VALIDATION_FAILED', 'Passwords must match.', 400, {
        passwordConfirmation: 'Passwords must match.',
      })
    }
    try {
      await this.client.send(new SignUpCommand({
        ClientId: this.env.cognitoClientId,
        Username: request.email,
        Password: request.password,
        UserAttributes: [{ Name: 'email', Value: request.email }],
      }))
      return { verificationRequired: true }
    } catch (error) {
      throw mapCognitoError(error)
    }
  }

  async resendVerification(request: ResendVerificationRequest): Promise<void> {
    try {
      await this.client.send(new ResendConfirmationCodeCommand({
        ClientId: this.env.cognitoClientId,
        Username: request.email,
      }))
    } catch (error) {
      throw mapCognitoError(error)
    }
  }

  async submitOtpAndLogin(request: SubmitOtpAndLoginRequest): Promise<{ session: UserSession; cookie: string }> {
    try {
      await this.client.send(new ConfirmSignUpCommand({
        ClientId: this.env.cognitoClientId,
        Username: request.email,
        ConfirmationCode: request.code,
      }))
      return this.login(request)
    } catch (error) {
      throw mapCognitoError(error)
    }
  }

  async login(request: LoginRequest): Promise<{ session: UserSession; cookie: string }> {
    try {
      const result = await this.client.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.env.cognitoClientId,
        AuthParameters: { USERNAME: request.email, PASSWORD: request.password },
      }))
      const accessToken = result.AuthenticationResult?.AccessToken
      const idToken = result.AuthenticationResult?.IdToken
      if (!accessToken) throw new UserServiceError('INTERNAL_ERROR', 'Cognito did not return an access token.', 500)
      const identity = await this.identityFromAccessToken(accessToken, idToken)
      return this.createSession(identity, accessToken)
    } catch (error) {
      if (error instanceof UserServiceError) throw error
      throw mapCognitoError(error)
    }
  }

  async getSession(session: StoredSession): Promise<UserSession> {
    return { user: await this.sessionUser(session) }
  }

  async changePassword(session: StoredSession, request: ChangePasswordRequest): Promise<void> {
    if (request.newPassword !== request.newPasswordConfirmation) {
      throw new UserServiceError('VALIDATION_FAILED', 'Passwords must match.', 400)
    }
    try {
      await this.client.send(new ChangePasswordCommand({
        AccessToken: session.cognitoAccessToken,
        PreviousPassword: request.currentPassword,
        ProposedPassword: request.newPassword,
      }))
    } catch (error) {
      throw mapCognitoError(error)
    }
  }

  async revoke(sessionCookie: string): Promise<void> {
    await this.sessions.revokeByTokenHash(hash(sessionCookie))
  }

  async createSession(identity: Identity, accessToken: string): Promise<{ session: UserSession; cookie: string }> {
    const cookie = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + this.env.sessionTtlSeconds * 1000)
    const stored = await this.sessions.create({
      tokenHash: hash(cookie),
      cognitoSub: identity.subject,
      email: identity.email,
      emailVerified: identity.emailVerified,
      role: identity.role,
      cognitoAccessToken: accessToken,
      expiresAt,
    })
    return { session: { user: await this.sessionUser(stored) }, cookie }
  }

  private async sessionUser(session: StoredSession): Promise<SessionUser> {
    const profile = await this.profiles.findByCognitoSub(session.cognitoSub)
    return {
      subject: session.cognitoSub,
      email: session.email,
      emailVerified: session.emailVerified,
      role: session.role,
      profileCreated: profile !== null,
    }
  }

  private async identityFromAccessToken(accessToken: string, idToken?: string): Promise<Identity> {
    const result = await this.client.send(new GetUserCommand({ AccessToken: accessToken }))
    const attributes = new Map((result.UserAttributes ?? []).map(attribute => [attribute.Name, attribute.Value]))
    const subject = attributes.get('sub')
    const email = attributes.get('email')
    if (!subject || !email) throw new UserServiceError('INTERNAL_ERROR', 'Cognito identity is incomplete.', 500)
    const idClaims = idToken ? decodeJwtPayload(idToken) : {}
    const groups = Array.isArray(idClaims['cognito:groups']) ? idClaims['cognito:groups'] : []
    const role = groups.includes(this.env.cognitoAdminGroupName) ? 'admin' : 'user'
    return { subject, email, emailVerified: attributes.get('email_verified') === 'true', role }
  }
}

export type Identity = {
  subject: string
  email: string
  emailVerified: boolean
  role: UserRole
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function mapCognitoError(error: unknown): UserServiceError {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  if (name === 'UsernameExistsException') return new UserServiceError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.', 409)
  if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') return new UserServiceError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
  if (name === 'UserNotConfirmedException') return new UserServiceError('EMAIL_NOT_VERIFIED', 'Verify your email before signing in.', 403)
  if (name === 'CodeMismatchException') return new UserServiceError('OTP_INVALID', 'The verification code is invalid.', 400)
  if (name === 'ExpiredCodeException') return new UserServiceError('OTP_EXPIRED', 'The verification code has expired.', 400)
  if (name === 'PasswordHistoryPolicyViolationException') return new UserServiceError('PASSWORD_REUSED', 'You cannot reuse a previous password.', 409)
  return new UserServiceError('INTERNAL_ERROR', 'The identity provider request failed.', 500)
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
  } catch {
    return {}
  }
}
