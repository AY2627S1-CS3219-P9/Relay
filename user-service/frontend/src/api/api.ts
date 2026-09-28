import {
  ChangePasswordRequest,
  CheckAuthRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendOtpResponse,
  SubmitOtpAndLoginRequest,
  SubmitOtpAndLoginResponse,
  UserApi,
  UpdateUserRequest,
  UpdateUserResponse,
  GetUserResponse,
  ChangePasswordResponse,
  CheckAuthResponse,
  LogoutResponse,
} from '@relay/contracts'
import {
  AuthError,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  signOut,
  signIn,
  signUp,
  updatePassword,
} from 'aws-amplify/auth'

const PROFILE_API_URL = '/api/user/me'

class ProfileRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ProfileRequestError'
  }
}

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()
  if (!token) {
    throw new Error('No authenticated session is available.')
  }
  return token
}

async function profileRequest<T>(input: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(PROFILE_API_URL, {
    ...input,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(input.body ? { 'Content-Type': 'application/json' } : {}),
      ...input.headers,
    },
  })

  if (!response.ok) {
    let message = `Profile request failed with status ${response.status}.`
    try {
      const body = (await response.json()) as { message?: string; error?: { message?: string } }
      message = body.error?.message ?? body.message ?? message
    } catch {
      // Keep the status-based message when the server has no JSON response.
    }
    throw new ProfileRequestError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const userApi: UserApi = {
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, passwordConfirmation } = request
    // Note that password confirmation is only checked client-side
    if (password !== passwordConfirmation) {
      return {
        success: false,
        error: { code: 'NON_MATCHING_PASSWORDS', message: 'Passwords must match exactly.' },
      }
    }
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
          },
          autoSignIn: true,
        },
      })
      if (isSignUpComplete || nextStep.signUpStep == 'DONE' || !userId) {
        throw { message: 'Something went wrong during sign up.' }
      }
      return { success: true }
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        if (e.name == 'UsernameExistsException') {
          return {
            success: false,
            error: {
              code: 'EMAIL_CONFLICT',
              message: 'An account with this email already exists.',
            },
          }
        }
        // TODO: Add AWS pre sign-up lambda trigger to check for nus email, and check here
        // TODO: Also check other exceptions like password validity and other cases
      }
      console.log(e)
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async resendOtp(email: string): Promise<ResendOtpResponse> {
    try {
      await resendSignUpCode({ username: email })
      return { success: true }
    } catch (e: unknown) {
      // TODO: check other exceptions
      console.log(e)
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async submitOtpAndLogin(request: SubmitOtpAndLoginRequest): Promise<SubmitOtpAndLoginResponse> {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: request.email,
        confirmationCode: request.code,
      })
      if (!isSignUpComplete) {
        throw { message: 'Something went wrong during OTP submission.' }
      }
      return this.login({ email: request.email, password: request.password })
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        switch (e.name) {
          case 'CodeMismatchException':
            return {
              success: false,
              error: { code: 'CODE_MISMATCH', message: 'Please enter the correct OTP.' },
            }
          case 'ExpiredCodeException':
            return {
              success: false,
              error: {
                code: 'CODE_EXPIRED',
                message: 'Your OTP has expired, please resend a new one.',
              },
            }
        }
      }
      console.log(e)
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const { nextStep } = await signIn({ username: request.email, password: request.password })
      if (nextStep.signInStep == 'CONFIRM_SIGN_UP') {
        // Does a resend once, no error checking to simplify things
        // User can just manually click resend again if this doesn't work
        this.resendOtp(request.email)
        return {
          success: true,
          data: { emailVerified: false, profileCreated: false },
        }
      }
      let profileCreated = false
      try {
        await this.getUser()
        profileCreated = true
      } catch (error) {
        if (!(error instanceof ProfileRequestError) || error.status !== 404) throw error
      }
      return {
        success: true,
        data: { emailVerified: true, profileCreated },
      }
    } catch (e: unknown) {
      // TODO: Add exception checking
      if (e instanceof AuthError) {
        switch (e.name) {
          case 'NotAuthorizedException':
          case 'UserNotFoundException':
            return {
              success: false,
              error: { code: 'INCORRECT_CREDENTIALS', message: 'Incorrect email or password.' },
            }
          case 'UserNotConfirmedException':
            return {
              success: true,
              data: { emailVerified: false, profileCreated: false },
            }
          // TODO: Check other exceptions
        }
      }
      console.log(e)
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      if (request.newPassword !== request.newPasswordConfirmation) {
        return {
          success: false,
          error: { code: 'NON_MATCHING_PASSWORDS', message: 'Passwords must match exactly.' },
        }
      }
      await updatePassword({
        oldPassword: request.currentPassword,
        newPassword: request.newPassword,
      })
      return { success: true }
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        switch (e.name) {
          case 'NotAuthorizedException':
            return {
              success: false,
              error: { code: 'WRONG_PASSWORD', message: 'The current password you entered is incorrect.' },
            }
          case 'PasswordHistoryPolicyViolationException':
            return {
              success: false,
              error: { code: 'REUSED_PASSWORD', message: 'You cannot reuse previous passwords.' },
            }
          case 'InvalidPasswordException':
            return {
              success: false,
              error: { code: 'INVALID_NEW_PASSWORD', message: 'New password does not meet requirements.' },
            }
        }
      }
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async logout(): Promise<LogoutResponse> {
    try {
      await signOut()
      return { success: true }
    } catch (e: unknown) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async checkAuth(request: CheckAuthRequest): Promise<CheckAuthResponse> {
    try {
      const session = await fetchAuthSession()
      const accessToken = session.tokens?.accessToken
      const currentToken = accessToken?.toString()

      if (!currentToken || currentToken !== request.sessionToken) {
        return {
          success: false,
          error: { code: 'INVALID_SESSION_TOKEN', message: 'The session token is invalid.' },
        }
      }

      const groups = accessToken?.payload?.['cognito:groups']
      const isAdmin = Array.isArray(groups) && groups.includes('admin')

      return { success: true, data: { role: isAdmin ? 'admin' : 'user' } }
    } catch (e: unknown) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  async getUser(): Promise<GetUserResponse> {
    return profileRequest<GetUserResponse>({ method: 'GET' })
  },
  async updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse> {
    return profileRequest<UpdateUserResponse>({
      method: 'PATCH',
      body: JSON.stringify(request),
    })
  },
  async deleteUser(confirmation: string): Promise<void> {
    await profileRequest<void>({
      method: 'DELETE',
      body: JSON.stringify({ confirmation }),
    })
    await signOut()
  },
}
