import { apiRequest } from '@/services/api'

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user?: {
    username?: string
    role?: string
  }
}

export type MeResponse = {
  user?: {
    username?: string
    role?: string
  }
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