import { apiRequest } from '@/services/api'
import { type AppConfig } from '@/types/config'

export type VersionInfo = string

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function getConfig(accessToken: string): Promise<AppConfig> {
  return apiRequest<AppConfig>('/v1/config', {
    headers: authHeaders(accessToken),
  })
}

export async function getVersion(accessToken: string): Promise<VersionInfo> {
  return apiRequest<VersionInfo>('/v1/version', {
    headers: authHeaders(accessToken),
  })
}
