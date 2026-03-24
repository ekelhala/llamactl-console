import { apiRequest } from '@/services/api'

export type LoginRequest = {
  username: string
  password: string
}

export type AuthenticatedUser = {
  username?: string
  role?: string
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user?: AuthenticatedUser
}

export type MeResponse = {
  user?: AuthenticatedUser
}

export type LogoutRequest = {
  refresh_token?: string
}

export type RefreshRequest = {
  refresh_token: string
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function getCurrentUser(accessToken: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function refreshAccessToken(request: RefreshRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function logout(request?: LogoutRequest): Promise<{ status?: string }> {
  return apiRequest<{ status?: string }>('/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request || {}),
  })
}