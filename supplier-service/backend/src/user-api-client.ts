import type {
  IsAdminRequest,
  IsAdminResponse,
  IsAuthenticatedRequest,
  IsAuthenticatedResponse,
} from '@relay/contracts/user'

const USER_API_URL = process.env.USER_API_URL || 'http://user-api:3000'
const USER_API_TIMEOUT = parseInt(process.env.USER_API_TIMEOUT || '5000', 10)

type IsAuthenticatedRequestBody = { session: string }
type IsAdminRequestBody = { session: string }

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), USER_API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function checkAuthenticated(session: string): Promise<boolean> {
  if (!session || session.trim() === '') {
    return false
  }

  try {
    const requestBody: IsAuthenticatedRequestBody = { session }
    const response = await fetchWithTimeout(`${USER_API_URL}/api/user/check-authenticated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      console.error(`checkAuthenticated failed: ${response.status} ${response.statusText}`)
      return false
    }

    const data = (await response.json()) as IsAuthenticatedResponse
    return data.success ? (data.data?.isAuthenticated ?? false) : false
  } catch (err) {
    console.error('checkAuthenticated network error:', err)
    return false
  }
}

export async function checkAdmin(session: string): Promise<boolean> {
  if (!session || session.trim() === '') {
    return false
  }

  try {
    const requestBody: IsAdminRequestBody = { session }
    const response = await fetchWithTimeout(`${USER_API_URL}/api/user/check-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      console.error(`checkAdmin failed: ${response.status} ${response.statusText}`)
      return false
    }

    const data = (await response.json()) as IsAdminResponse
    return data.success ? (data.data?.isAdmin ?? false) : false
  } catch (err) {
    console.error('checkAdmin network error:', err)
    return false
  }
}
