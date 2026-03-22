import { apiRequest } from '@/services/api'

export type InstanceSummary = {
  name: string
  status: string
  backend: string
  model: string
  raw: Record<string, unknown>
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function tailLines(text: string, maxLines: number): string {
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length <= maxLines) {
    return normalized
  }

  return lines.slice(-maxLines).join('\n')
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }

  return ''
}

function normalizeInstance(item: unknown, index: number): InstanceSummary {
  if (!isRecord(item)) {
    const fallbackName = `instance-${index + 1}`
    return {
      name: fallbackName,
      status: 'unknown',
      backend: 'n/a',
      model: 'n/a',
      raw: { value: item },
    }
  }

  const name = readString(item, ['name', 'instance_name', 'id']) || `instance-${index + 1}`
  const status = readString(item, ['status', 'state']) || 'unknown'
  const backend = readString(item, ['backend', 'backend_type']) || 'n/a'
  const model = readString(item, ['model', 'model_name']) || 'n/a'

  return {
    name,
    status,
    backend,
    model,
    raw: item,
  }
}

function normalizeListResponse(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (isRecord(payload)) {
    const candidates = ['instances', 'data', 'items']
    for (const key of candidates) {
      const value = payload[key]
      if (Array.isArray(value)) {
        return value
      }
    }
  }

  return []
}

export async function listInstances(accessToken: string): Promise<InstanceSummary[]> {
  const payload = await apiRequest<unknown>('/v1/instances', {
    headers: authHeaders(accessToken),
  })

  return normalizeListResponse(payload).map((item, index) => normalizeInstance(item, index))
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
  const payload = await apiRequest<unknown>(
    `/v1/instances/${encodeURIComponent(name)}/logs?lines=${encodeURIComponent(String(lines))}`,
    {
      headers: authHeaders(accessToken),
    }
  )

  if (typeof payload === 'string') {
    return tailLines(payload, lines)
  }

  if (Array.isArray(payload)) {
    return payload
      .slice(-lines)
      .map((line) => String(line))
      .join('\n')
  }

  if (isRecord(payload)) {
    const logsValue = payload.logs
    if (typeof logsValue === 'string') {
      return tailLines(logsValue, lines)
    }

    if (Array.isArray(logsValue)) {
      return logsValue
        .slice(-lines)
        .map((line) => String(line))
        .join('\n')
    }

    const linesValue = payload.lines
    if (Array.isArray(linesValue)) {
      return linesValue
        .slice(-lines)
        .map((line) => String(line))
        .join('\n')
    }

    return JSON.stringify(payload, null, 2)
  }

  return String(payload)
}
