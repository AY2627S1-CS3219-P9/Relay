import {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendOtpResponse,
  SubmitOtpAndLoginRequest,
  SubmitOtpAndLoginResponse,
  UserApi,
} from '@relay/contracts'
import {
  AuthError,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signUp,
} from 'aws-amplify/auth'

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
      console.log(e);
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
      console.log(e);
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
      console.log(e);
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
      // TODO: Add api request to backend to check profile creation
      // can just directly use fetchAuthSession to get session token to pass to backend
      return {
        success: true,
        data: { emailVerified: true, profileCreated: true },
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
      console.log(e);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: (e as any)?.message ?? String(e) },
      }
    }
  },
  changePassword: function (request: ChangePasswordRequest): Promise<void> {
    throw new Error('Function not implemented.')
  },
  logout: function (): Promise<void> {
    throw new Error('Function not implemented.')
  },
}
