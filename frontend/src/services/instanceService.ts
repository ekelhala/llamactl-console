import { apiRequest } from '@/services/api'
import { type CreateInstanceOptions, type Instance } from '@/types/instance'

type ListInstancesResponse =
  | Instance[]
  | {
      instances: Instance[]
    }

type InstanceLogsResponse =
  | string
  | string[]
  | {
      logs?: string | string[]
      lines?: string[]
    }

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function tailLines(text: string, maxLines: number): string {
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length <= maxLines) {
    return normalized
  }

  return lines.slice(-maxLines).join('\n')
}

function toLogText(payload: InstanceLogsResponse, maxLines: number): string {
  if (typeof payload === 'string') {
    return tailLines(payload, maxLines)
  }

  if (Array.isArray(payload)) {
    return payload.slice(-maxLines).join('\n')
  }

  if (typeof payload.logs === 'string') {
    return tailLines(payload.logs, maxLines)
  }

  if (Array.isArray(payload.logs)) {
    return payload.logs.slice(-maxLines).join('\n')
  }

  if (Array.isArray(payload.lines)) {
    return payload.lines.slice(-maxLines).join('\n')
  }

  return ''
}

export async function listInstances(accessToken: string): Promise<Instance[]> {
  const payload = await apiRequest<ListInstancesResponse>('/v1/instances', {
    headers: authHeaders(accessToken),
  })

  return Array.isArray(payload) ? payload : payload.instances
}

export async function getInstance(accessToken: string, name: string): Promise<Instance> {
  return apiRequest<Instance>(`/v1/instances/${encodeURIComponent(name)}`, {
    headers: authHeaders(accessToken),
  })
}

export async function createInstance(accessToken: string, name: string, options: CreateInstanceOptions): Promise<Instance> {
  return apiRequest<Instance>(`/v1/instances/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
}

export async function updateInstance(accessToken: string, name: string, options: CreateInstanceOptions): Promise<Instance> {
  return apiRequest<Instance>(`/v1/instances/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
}

export async function deleteInstance(accessToken: string, name: string): Promise<void> {
  await apiRequest<unknown>(`/v1/instances/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
}

async function postInstanceAction(accessToken: string, name: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  await apiRequest<unknown>(`/v1/instances/${encodeURIComponent(name)}/${action}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
}

export async function startInstance(accessToken: string, name: string): Promise<void> {
  await postInstanceAction(accessToken, name, 'start')
}

export async function stopInstance(accessToken: string, name: string): Promise<void> {
  await postInstanceAction(accessToken, name, 'stop')
}

export async function restartInstance(accessToken: string, name: string): Promise<void> {
  await postInstanceAction(accessToken, name, 'restart')
}

export async function getInstanceLogs(accessToken: string, name: string, lines = 200): Promise<string> {
  const payload = await apiRequest<InstanceLogsResponse>(
    `/v1/instances/${encodeURIComponent(name)}/logs?lines=${encodeURIComponent(String(lines))}`,
    {
      headers: authHeaders(accessToken),
    }
  )

  return toLogText(payload, lines)
}

export async function proxyInstanceRequest(
  accessToken: string,
  name: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<string> {
  return apiRequest<string>(`/v1/instances/${encodeURIComponent(name)}/proxy`, {
    method,
    headers: {
      ...authHeaders(accessToken),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
