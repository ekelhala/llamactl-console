import { apiRequest } from '@/services/api'

export type NodeResponse = {
  address?: string
}

export type OpenAIInstance = {
  id: string
  object: string
  created: number
  owned_by: string
}

export type OpenAIListInstancesResponse = {
  object: string
  data: OpenAIInstance[]
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function listNodes(accessToken: string): Promise<Record<string, NodeResponse>> {
  return apiRequest<Record<string, NodeResponse>>('/v1/nodes', {
    headers: authHeaders(accessToken),
  })
}

export async function getNode(accessToken: string, name: string): Promise<NodeResponse> {
  return apiRequest<NodeResponse>(`/v1/nodes/${encodeURIComponent(name)}`, {
    headers: authHeaders(accessToken),
  })
}

export async function listOpenAIModels(accessToken: string): Promise<OpenAIListInstancesResponse> {
  return apiRequest<OpenAIListInstancesResponse>('/v1/models', {
    headers: authHeaders(accessToken),
  })
}

export async function postOpenAIProxy(
  accessToken: string,
  path: string,
  payload: unknown
): Promise<unknown> {
  const suffix = path.replace(/^\/+/, '')
  const endpoint = suffix ? `/v1/${suffix}` : '/v1/'

  return apiRequest<unknown>(endpoint, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function getHealth(): Promise<unknown> {
  return apiRequest<unknown>('/health')
}

export async function getHealthLive(): Promise<unknown> {
  return apiRequest<unknown>('/health/live')
}

export async function getHealthReady(): Promise<unknown> {
  return apiRequest<unknown>('/health/ready')
}
