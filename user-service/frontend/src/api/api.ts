import type {
  ApiResult,
  ChangePasswordRequest,
  DeleteUserRequest,
  GetSessionResponse,
  GetUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  SubmitOtpAndLoginRequest,
  SubmitOtpAndLoginResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UserApi,
  UserApiError,
} from '@relay/contracts'

const USER_API_URL = '/api/user'

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`${USER_API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 204) return { ok: true, data: undefined as T }

  const body = (await response.json()) as
    | { ok: true; data: T }
    | { ok: false; error: UserApiError }
  if (response.ok && body.ok === true) return { ok: true, data: body.data }

  if (typeof body === 'object' && body !== null && 'ok' in body && body.ok === false) {
    return body
  }

  throw new Error('The User Service returned an invalid error response.')
}

function jsonRequest<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  return request<T>(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

/** Browser adapter for the backend-owned UserApi contract. */
export const userApi: UserApi = {
  register(requestBody: RegisterRequest): Promise<ApiResult<RegisterResponse>> {
    return jsonRequest('/auth/register', 'POST', requestBody)
  },

  resendVerification(requestBody: ResendVerificationRequest): Promise<ApiResult<undefined>> {
    return jsonRequest('/auth/verification/resend', 'POST', requestBody)
  },

  submitOtpAndLogin(
    requestBody: SubmitOtpAndLoginRequest,
  ): Promise<ApiResult<SubmitOtpAndLoginResponse>> {
    return jsonRequest('/auth/verification/confirm-and-login', 'POST', requestBody)
  },

  login(requestBody: LoginRequest): Promise<ApiResult<LoginResponse>> {
    return jsonRequest('/auth/login', 'POST', requestBody)
  },

  logout(): Promise<ApiResult<undefined>> {
    return jsonRequest('/auth/logout', 'POST')
  },

  getSession(): Promise<ApiResult<GetSessionResponse>> {
    return request('/session')
  },

  changePassword(requestBody: ChangePasswordRequest): Promise<ApiResult<undefined>> {
    return jsonRequest('/auth/password', 'POST', requestBody)
  },

  getUser(): Promise<ApiResult<GetUserResponse>> {
    return request('/me')
  },

  updateUser(requestBody: UpdateUserRequest): Promise<ApiResult<UpdateUserResponse>> {
    return jsonRequest('/me', 'PATCH', requestBody)
  },

  deleteUser(requestBody: DeleteUserRequest): Promise<ApiResult<undefined>> {
    return jsonRequest('/me', 'DELETE', requestBody)
  },
}
