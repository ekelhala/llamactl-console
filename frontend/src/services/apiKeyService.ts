import { apiRequest } from '@/services/api'
import {
  type ApiKey,
  type CreateKeyRequest,
  type CreateKeyResponse,
  type KeyPermissionResponse,
} from '@/types/apiKey'

type ListApiKeysResponse =
  | ApiKey[]
  | {
      keys: ApiKey[]
    }

type GetApiKeyResponse =
  | ApiKey
  | {
      key: ApiKey
    }

type KeyPermissionsResponse =
  | KeyPermissionResponse[]
  | {
      permissions: KeyPermissionResponse[]
    }

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function listApiKeys(accessToken: string): Promise<ApiKey[]> {
  const payload = await apiRequest<ListApiKeysResponse>('/v1/auth/keys', {
    headers: authHeaders(accessToken),
  })

  return Array.isArray(payload) ? payload : payload.keys
}

export async function getApiKey(accessToken: string, id: number): Promise<ApiKey> {
  const payload = await apiRequest<GetApiKeyResponse>(`/v1/auth/keys/${encodeURIComponent(String(id))}`, {
    headers: authHeaders(accessToken),
  })

  return 'id' in payload ? payload : payload.key
}

export async function createApiKey(accessToken: string, request: CreateKeyRequest): Promise<CreateKeyResponse> {
  return apiRequest<CreateKeyResponse>('/v1/auth/keys', {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: request }),
  })
}

export async function deleteApiKey(accessToken: string, id: number): Promise<void> {
  await apiRequest<unknown>(`/v1/auth/keys/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
}

export async function getApiKeyPermissions(accessToken: string, id: number): Promise<KeyPermissionResponse[]> {
  const payload = await apiRequest<KeyPermissionsResponse>(
    `/v1/auth/keys/${encodeURIComponent(String(id))}/permissions`,
    {
      headers: authHeaders(accessToken),
    }
  )

  return Array.isArray(payload) ? payload : payload.permissions
}
